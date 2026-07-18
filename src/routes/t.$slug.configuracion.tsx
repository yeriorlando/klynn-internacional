import { createFileRoute, Link } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  saveTenant, DEFAULT_CONFIG, formatPhoneRD, formatCedulaRD, PROVINCIAS_RD, NCF_TIPOS,
  formatAmountInput, parseAmount, getPlans, updateTenantPlan, getGlobalConfig, formatRD,
  getTenantPlan, getECFConfig, saveECFConfig, getECFSequences, saveECFSequence, nextECFNumero, deleteECFSequence,
  isModuleEnabled,
  type Tenant, type TenantConfig, type WhatsAppConfig, type PlanId, type Plan, type Gasto,
  type GlobalConfig, type BankDetails, type ECFConfig, type ECFSequence
} from "@/lib/storage";
import { getProneSoftClient, registerTenantInPronesoft, uploadCertificateToPronesoft, importSequencesToPronesoft } from "@/lib/fiscal";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { useECFConfig, usePlans, useGlobalConfig, useECFSequences } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, MessageCircle, Send, Loader2, Save, Image as ImageIcon, Upload, Calendar,
  User, Palette, FileText, Banknote, Star, Sparkles, ArrowRight, Copy, Smartphone, CheckCircle2, ShieldCheck, PlusCircle, Bell, BellOff,
  FlaskConical, Globe
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/t/$slug/configuracion")({ component: ConfigPage });

const FIELD = "h-11 rounded-lg border-input bg-background text-base focus-visible:ring-1 focus-visible:ring-ring transition-all px-4";
const LABEL = "text-sm font-medium text-foreground";
const CARD = "border shadow-sm p-6 rounded-lg";

// Mapa de nombres completos para tipos de comprobantes fiscales
const NCF_NOMBRES: Record<string, string> = {
  B01: "CRÉDITO FISCAL", B02: "CONSUMIDOR FINAL", B03: "NOTA DE DÉBITO", B04: "NOTA DE CRÉDITO",
  B14: "RÉGIMEN ESPECIAL", B15: "GUBERNAMENTAL", B16: "EXPORTACIONES",
  E31: "CRÉDITO FISCAL", E32: "CONSUMIDOR FINAL", E33: "NOTA DE DÉBITO", E34: "NOTA DE CRÉDITO",
  E41: "COMPRAS", E43: "GASTOS MENORES", E44: "REGÍMENES ESPECIALES", E45: "GUBERNAMENTAL", E46: "EXPORTACIONES", E47: "PAGOS AL EXTERIOR",
};

function Field({ label, children, hint, span }: { label: string; children: React.ReactNode; hint?: string; span?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${span ? "md:col-span-2" : ""}`}>
      <Label className={LABEL}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ConfigPage() {
  const auth = useRequireAuth();
  const queryClient = useQueryClient();
  const tenantId = auth?.tenant?.id ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  const { data: plans = [] } = usePlans();
  const { data: globalConfigData } = useGlobalConfig();
  const { data: ecfConfig, isLoading: loadingECF } = useECFConfig(tenantId);
  const { data: ecfSequences = [] } = useECFSequences(tenantId);

  const globalConfig = globalConfigData || null;

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (tenant) {
      const root = document.documentElement;
      root.style.setProperty("--brand-primary", tenant.color_primario);
      root.style.setProperty("--primary", tenant.color_primario);
      root.style.setProperty("--ring", tenant.color_primario);
    }
  }, [tenant?.color_primario]);

  useEffect(() => {
    if (auth?.tenant && auth.tenant.id !== '__loading__' && !tenant) {
      setTenant(auth.tenant);
    }
  }, [auth, tenant]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('polar_success') === 'true') {
      setShowSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    const t = params.get('tab');
    if (t && ['perfil', 'apariencia', 'factura', 'caja', 'fiscal', 'whatsapp', 'plan'].includes(t)) {
      setActiveTab(t);
    }
  }, []);

  if (!auth || auth.tenant.id === '__loading__' || !tenant) return null;

  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;
  const plan = plans.find(p => p.id === tenant.plan_id);
  const hasFiscal = isModuleEnabled(tenant, 'facturacion_fiscal', plan);
  const hasWA = isModuleEnabled(tenant, 'whatsapp', plan);
  const wa: WhatsAppConfig = cfg.whatsapp || DEFAULT_CONFIG.whatsapp!;

  async function save(updates: Partial<Tenant>) {
    try {
      const next: Tenant = { ...tenant!, ...updates } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      console.error("Error saving tenant:", err);
      toast.error("Error al guardar: " + (err.message || "desconocido"));
    }
  }
  async function saveCfg(c: Partial<TenantConfig>) {
    try {
      const next: Tenant = { ...tenant!, config: { ...cfg, ...c } } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error("Error al guardar configuración: " + (err.message || "desconocido"));
    }
  }
  function updateCfg(c: Partial<TenantConfig>) {
    setTenant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        config: {
          ...(prev.config || DEFAULT_CONFIG),
          ...c
        }
      };
    });
  }
  async function saveWA(w: Partial<WhatsAppConfig>) {
    await saveCfg({ whatsapp: { ...wa, ...w } });
  }

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isForcedExpired = params.get('expired') === 'true';
  const isTrialExpired = isForcedExpired || (tenant?.estado === "TRIAL" && new Date(tenant.trial_hasta).getTime() < Date.now());

  return (
    <div>
      <PageHeader title="Configuración" description="Personaliza tu lavandería." />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap md:flex-nowrap w-full h-auto bg-accent/20 p-1.5 rounded-2xl gap-1.5 border border-border">
          {[
            { id: 'perfil', label: 'Perfil', icon: User },
            { id: 'apariencia', label: 'Apariencia', icon: Palette },
            { id: 'factura', label: 'Ticket', icon: FileText },
            { id: 'caja', label: 'Caja', icon: Banknote },
            { id: 'fiscal', label: 'Fiscal', icon: Shield },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
            { id: 'plan', label: 'Plan', icon: CreditCard },
          ].map(t => (
            <TabsTrigger 
              key={t.id}
              value={t.id}
              disabled={isTrialExpired && t.id !== 'plan'}
              className="rounded-xl py-2 px-2 md:px-3 text-xs md:text-[13px] font-bold transition-all data-[state=active]:text-white data-[state=active]:shadow-lg border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-white flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-1 md:flex-auto"
              style={{ 
                backgroundColor: activeTab === t.id ? tenant.color_primario : undefined
              }}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="perfil">
          <Card className={CARD}>
            <div className="space-y-6">
              {/* Fila 1: Datos principales */}
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nombre comercial"><Input className={FIELD} placeholder="Ej: Lavandería Klynn Central" value={tenant.nombre} onChange={(e) => setTenant({ ...tenant, nombre: e.target.value })} /></Field>
                <Field label="Teléfono"><Input className={FIELD} placeholder="Ej: 809-000-0000" value={tenant.telefono} onChange={(e) => setTenant({ ...tenant, telefono: formatPhoneRD(e.target.value) })} /></Field>
                <Field label="Email"><Input className={FIELD} placeholder="Ej: admin@lavanderia.com" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} /></Field>
              </div>

              {/* Fila 2: Ubicación */}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provincia">
                  <Select value={tenant.provincia || ""} onValueChange={(v) => setTenant({ ...tenant, provincia: v })}>
                    <SelectTrigger className={FIELD}><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_RD.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dirección"><Input className={FIELD} placeholder="Calle Principal #123, Edificio Los Laureles" value={tenant.direccion} onChange={(e) => setTenant({ ...tenant, direccion: e.target.value })} /></Field>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t flex justify-start">
              <Button onClick={() => save(tenant)}>
                <Save className="mr-2 h-4 w-4" /> Guardar cambios
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apariencia" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tarjeta 1: Logotipo */}
            <Card className={CARD + " flex flex-col items-center justify-center min-h-[340px] text-center"}>
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  {tenant.logo_url ? (
                    <div className="relative group">
                      <img src={tenant.logo_url} alt="Logo" className="h-32 w-32 rounded-full object-contain bg-white p-4 shadow-sm border" />
                      <button onClick={() => setTenant({ ...tenant, logo_url: undefined })} 
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 transition group-hover:opacity-100 shadow-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent/50 text-muted-foreground border-2 border-dashed border-border/60">
                      <ImageIcon className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Logotipo de la empresa</div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">Se mostrará en la factura (ticket) y en el dashboard.</p>
                  </div>
                </div>
                <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file, 512, 512, 0.7);
                      setTenant({ ...tenant, logo_url: compressed });
                    } catch {
                      toast.error("Error al procesar la imagen");
                    }
                  }
                }} />
                <Button variant="outline" size="sm" onClick={() => document.getElementById("logo-upload")?.click()}>
                  <Upload className="mr-2 h-3.5 w-3.5" /> {tenant.logo_url ? "Cambiar imagen" : "Subir logotipo"}
                </Button>
              </div>
            </Card>

            {/* Tarjeta 2: Color Primario */}
            <Card className={CARD + " flex flex-col items-center justify-center min-h-[340px] text-center"}>
              <div className="w-full max-w-sm space-y-6">
                <div className="space-y-2">
                  <div className="font-bold text-sm">Color de identidad</div>
                  <p className="text-xs text-muted-foreground">Define el color principal de los botones y acentos del sistema.</p>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center w-full mt-4">
                  <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-slate-50/80 border border-slate-200/50 rounded-full shadow-inner w-full max-w-[340px] mx-auto">
                    {[
                      { name: "Klynn Blue", hex: "#0F4C81" },
                      { name: "Teal", hex: "#0D9488" },
                      { name: "Emerald", hex: "#059669" },
                      { name: "Purple", hex: "#7C3AED" },
                      { name: "Ruby", hex: "#E11D48" },
                      { name: "Amber", hex: "#D97706" },
                      { name: "Slate", hex: "#334155" },
                    ].map((p) => {
                      const isSelected = tenant.color_primario.toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setTenant({ ...tenant, color_primario: p.hex })}
                          className="relative h-8 w-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: p.hex }}
                          title={p.name}
                        >
                          {isSelected && (
                            <div className="h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.hex }} />
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Color Selector */}
                    <div className="relative h-8 w-8 rounded-full border border-slate-250 bg-white hover:bg-slate-100 transition-all flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 group active:scale-95">
                      <input
                        type="color"
                        value={tenant.color_primario}
                        onChange={(e) => setTenant({ ...tenant, color_primario: e.target.value })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        title="Seleccionar otro color"
                      />
                      <Palette className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-500">
                      CÓDIGO HEX: <span className="uppercase text-slate-700">{tenant.color_primario}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="factura">
          <Card className={CARD}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Formato impresora">
                <Select value={cfg.formato_ticket} onValueChange={(v: any) => updateCfg({ formato_ticket: v })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="57mm">57mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tiempo de entrega estándar">
                <Select value={String(cfg.tiempo_entrega_estandar || 24)} onValueChange={(v) => updateCfg({ tiempo_entrega_estandar: Number(v) })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">1 DÍA (24 HORAS)</SelectItem>
                    <SelectItem value="48">2 DÍAS (48 HORAS)</SelectItem>
                    <SelectItem value="72">3 DÍAS (72 HORAS)</SelectItem>
                    <SelectItem value="96">4 DÍAS (96 HORAS)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tiempo de entrega URGENTE">
                <Select value={String(cfg.tiempo_entrega_urgente || 6)} onValueChange={(v) => updateCfg({ tiempo_entrega_urgente: Number(v) })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 HORAS</SelectItem>
                    <SelectItem value="6">6 HORAS</SelectItem>
                    <SelectItem value="12">12 HORAS</SelectItem>
                    <SelectItem value="24">1 DÍA (24 HORAS)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Pie de página del ticket">
                <Textarea 
                  className="rounded-md border-input focus-visible:ring-1 focus-visible:ring-ring" 
                  value={cfg.ticket_pie || ""} 
                  onChange={(e) => updateCfg({ ticket_pie: e.target.value })} 
                  rows={2} 
                />
              </Field>

              <Field label="Nota o mensaje personalizado (Adicional)" span>
                <Textarea 
                  className="rounded-md border-input focus-visible:ring-1 focus-visible:ring-ring" 
                  value={cfg.ticket_nota || ""} 
                  onChange={(e) => updateCfg({ ticket_nota: e.target.value })} 
                  rows={2} 
                  placeholder="Mensaje o nota adicional que aparecerá debajo del pie de página del ticket..."
                />
              </Field>

              <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-primary">Mostrar empleado en ticket</span>
                  <p className="text-[10px] text-muted-foreground">Imprime el nombre del cajero que procesó la orden en la parte inferior del recibo.</p>
                </div>
                <Switch 
                  checked={cfg.ticket_mostrar_empleado} 
                  onCheckedChange={(v) => updateCfg({ ticket_mostrar_empleado: v })} 
                />
              </label>

              <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-primary">Ubicación de la ropa en Conveyor</span>
                  <p className="text-[10px] text-muted-foreground">Permite al cajero ingresar dónde está la ropa. Se mostrará en el ticket.</p>
                </div>
                <Switch 
                  checked={cfg.usar_ubicacion_ropa || false} 
                  onCheckedChange={(v) => updateCfg({ usar_ubicacion_ropa: v })} 
                />
              </label>
            </div>
            <Button className="mt-6" onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="caja">
          <Card className={CARD}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Recargo urgencia %">
                <Input className={FIELD} type="number" value={cfg.recargo_urgencia} onChange={(e) => updateCfg({ recargo_urgencia: Number(e.target.value) })} />
              </Field>
              <Field label="Umbral diferencia caja (RD$)">
                <Input className={FIELD} value={formatAmountInput(String(cfg.umbral_diferencia_caja))} onChange={(e) => updateCfg({ umbral_diferencia_caja: parseAmount(e.target.value) })} />
              </Field>
              <Field label="Máx caja chica (RD$)">
                <Input className={FIELD} value={formatAmountInput(String(cfg.monto_max_caja_chica))} onChange={(e) => updateCfg({ monto_max_caja_chica: parseAmount(e.target.value) })} />
              </Field>

              <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20 w-full h-fit self-end">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-primary">Habilitar selección de servicios</span>
                  <p className="text-[10px] text-muted-foreground">Muestra los botones de servicios (lavado, secado) en nueva orden.</p>
                </div>
                <Switch 
                  checked={cfg.pos_habilitar_servicios !== false} 
                  onCheckedChange={(v) => updateCfg({ pos_habilitar_servicios: v })} 
                />
              </label>

              <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20 h-fit self-end">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-primary">Habilitar selección de prendas</span>
                  <p className="text-[10px] text-muted-foreground">Permite desglosar prendas individuales en nueva orden.</p>
                </div>
                <Switch 
                  checked={cfg.pos_habilitar_prendas !== false} 
                  onCheckedChange={(v) => updateCfg({ pos_habilitar_prendas: v })} 
                />
              </label>

              <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20 h-fit self-end">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-primary">Interfaz de venta POS (Modo POS)</span>
                  <p className="text-[10px] text-muted-foreground">Activa el modo de cobro rápido optimizado para pantallas táctiles.</p>
                </div>
                <Switch 
                  checked={cfg.pos_modo_defecto !== false} 
                  onCheckedChange={(v) => updateCfg({ pos_modo_defecto: v })} 
                />
              </label>


            </div>
            <Button className="mt-6" onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <FiscalTab 
            tenant={tenant} 
            config={ecfConfig} 
            sequences={ecfSequences}
            onRefresh={() => { queryClient.invalidateQueries({ queryKey: ['ecf-config', tenantId] }); queryClient.invalidateQueries({ queryKey: ['ecf-sequences', tenantId] }); }}
            enabled={!!hasFiscal}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab 
            tenant={tenant} 
            wa={cfg.whatsapp || DEFAULT_CONFIG.whatsapp!} 
            saveWA={(w) => saveCfg({ whatsapp: { ...wa, ...w } })} 
            enabled={!!hasWA}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="plan">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Planes de Suscripción</h3>
              <p className="text-sm text-muted-foreground">Elige el plan que mejor se adapte al crecimiento de tu lavandería.</p>
            </div>
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
              <Button 
                variant={billingPeriod === "monthly" ? "default" : "ghost"} 
                size="sm" 
                className={`rounded-lg font-bold text-xs px-4 h-8 transition-all ${billingPeriod === "monthly" ? "text-white shadow-sm" : "text-muted-foreground"}`}
                style={{ backgroundColor: billingPeriod === "monthly" ? tenant.color_primario : undefined }}
                onClick={() => setBillingPeriod("monthly")}
              >
                Mensual
              </Button>
              <Button 
                variant={billingPeriod === "yearly" ? "default" : "ghost"} 
                size="sm" 
                className={`rounded-lg font-bold text-xs px-4 h-8 transition-all ${billingPeriod === "yearly" ? "text-white shadow-sm" : "text-muted-foreground"}`}
                style={{ backgroundColor: billingPeriod === "yearly" ? tenant.color_primario : undefined }}
                onClick={() => setBillingPeriod("yearly")}
              >
                Anual
              </Button>
            </div>
          </div>

          {/* Plan Actual Banner */}
          <div 
            className="mb-8 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl transition-all border-none text-white relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${tenant.color_primario || '#e11d48'}, ${tenant.color_secundario || '#9f1239'})` 
            }}
          >
            {/* Ambient glows inside the card */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div 
                className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform shrink-0"
                style={{ color: tenant.color_primario || '#e11d48' }}
              >
                <CreditCard className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">Suscripción actual</div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const planConfig = {
                      basico: { label: "Básico", className: "bg-white text-blue-700 font-extrabold border-transparent" },
                      pro: { label: "Pro", className: "bg-white text-indigo-700 font-extrabold border-transparent" },
                      enterprise: { label: "Enterprise", className: "bg-white text-amber-700 font-extrabold border-transparent" },
                    }[tenant.plan_id as string] || { label: tenant.plan_id, className: "bg-white text-primary font-extrabold border-transparent" };
                    
                    return (
                      <span className={`px-3 py-1 rounded-full uppercase text-[10px] font-black tracking-widest border shadow-sm ${planConfig.className}`}>
                        {planConfig.label}
                      </span>
                    );
                  })()}

                  {(() => {
                    const statusClass = tenant.estado === "ACTIVO" 
                      ? "bg-emerald-500 text-white font-extrabold border-transparent shadow-md" 
                      : isTrialExpired 
                        ? "bg-rose-500 text-white font-extrabold border-transparent shadow-md" 
                        : "bg-amber-500 text-white font-extrabold border-transparent shadow-md";
                    
                    return (
                      <Badge 
                        variant="outline" 
                        className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${statusClass}`}
                      >
                        {tenant.estado === "TRIAL" ? (isTrialExpired ? "Expirado" : "Prueba") : tenant.estado}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Renewal status info - highly visible block */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-lg min-w-[240px] relative z-10">
              <div 
                className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                style={{ color: tenant.color_primario || '#e11d48' }}
              >
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {tenant.estado === "TRIAL" ? (isTrialExpired ? "Expiró el" : "Vence el") : "Próxima renovación"}
                </div>
                <div className="text-base font-black tracking-wide">
                  {tenant.trial_hasta ? (
                    <span 
                      style={{ color: tenant.color_primario || '#e11d48' }}
                      className="font-black text-base"
                    >
                      {new Date(tenant.trial_hasta).toLocaleDateString("es-DO")}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-start">
            {plans.map(p => {
              const isCurrent = p.id === tenant.plan_id;
              const showActualBadge = isCurrent && !isTrialExpired;
              const isCurrentActivePlan = isCurrent && tenant.estado !== "TRIAL";

              const monthlyTotal = p.precio_mensual * 12;
              const annualPrice = p.precio_anual || monthlyTotal;
              const savings = monthlyTotal > annualPrice ? Math.round((1 - annualPrice / monthlyTotal) * 100) : 0;
              
              const price = billingPeriod === "monthly" ? p.precio_mensual : annualPrice;
              const period = billingPeriod === "monthly" ? "/mes" : "/año";
              
              return (
                <Card key={p.id} className={`p-6 border-none shadow-card flex flex-col relative overflow-hidden ${showActualBadge ? "ring-2 ring-primary" : ""}`}>
                  {showActualBadge && <div className="absolute top-0 right-0 bg-primary text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold uppercase tracking-widest">Actual</div>}
                  <div className="font-display text-xl mb-1">{p.nombre}</div>
                  <div className="flex flex-col mb-4">
                    <div className="text-2xl font-display text-primary">
                      {formatRD(price)}
                      <span className="text-xs font-normal text-muted-foreground">{period}</span>
                    </div>
                    {billingPeriod === "yearly" && savings > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                        Ahorras {savings}% vs mensual
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="text-xs flex items-center gap-2">✅ {p.limite_empleados} Empleados</div>
                    <div className="text-xs flex items-center gap-2">✅ {p.limite_ordenes_mes ?? "∞"} Órdenes/facturas/mes</div>
                    {p.modulos?.whatsapp && (
                      <div className="text-xs flex items-center gap-2 font-medium text-blue-600">
                        ✅ {(p.limite_whatsapp_mes || 0).toLocaleString()} Mensajes WhatsApp/mes
                      </div>
                    )}
                    {(["whatsapp", "facturacion_fiscal", "multisucursal", "logistica"] as const).map((k) => {
                      const v = p.modulos?.[k as keyof typeof p.modulos];
                      
                      let label: React.ReactNode = "";
                      if (k === "logistica") label = "Logística y Repartidores";
                      else if (k === "facturacion_fiscal") label = (
                        <span>
                          Facturación Electrónica <strong className="font-extrabold text-foreground opacity-100">(Costo por uso)</strong>
                        </span>
                      );
                      else if (k === "whatsapp") label = "WhatsApp";
                      else if (k === "multisucursal") label = (
                        <span>
                          Multi-sucursal <strong className="font-extrabold text-foreground opacity-100">(Cargo adicional)</strong>
                        </span>
                      );
                      else label = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");

                      return (
                        <div key={k} className={`text-xs flex items-center gap-2 ${v ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
                           {v ? "✅" : "❌"} <span>{label}</span>
                           {k === "multisucursal" && v && (
                             <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
                               Hasta {1 + (p.limite_sucursales_adicionales || 0)}
                             </span>
                           )}
                        </div>
                      );
                    })}
                    <div className="text-xs flex items-center gap-2">✅ Clientes ilimitados</div>
                    <div className="text-xs flex items-center gap-2">✅ Generación de reportes</div>
                    <div className="text-xs flex items-center gap-2">✅ Actualizaciones de software</div>
                    <div className="text-xs flex items-center gap-2">✅ Cuentas x cobrar</div>
                    <div className="text-xs flex items-center gap-2">✅ Impresión A4/80mm</div>
                  </div>

                      <Button 
                        className="mt-auto h-10 rounded-xl font-bold" 
                        variant={isCurrentActivePlan ? "outline" : "default"}
                        disabled={isCurrentActivePlan}
                        onClick={() => { setSelectedPlan(p); setShowCheckout(true); }}
                      >
                        {isCurrentActivePlan 
                          ? "Tu plan" 
                          : (isTrialExpired || tenant.estado === "TRIAL" ? "Contratar plan" : "Cambiar plan")}
                      </Button>
                </Card>
              )
            })}
          </div>

          <SubscriptionModal 
            open={showCheckout} 
            onOpenChange={setShowCheckout} 
            plan={selectedPlan} 
            period={billingPeriod}
            bank={globalConfig?.bankDetails}
            tenant={tenant}
            onSuccess={() => { setShowCheckout(false); setShowSuccess(true); }}
          />

          <SuccessModal 
            open={showSuccess} 
            onOpenChange={setShowSuccess} 
            planName={selectedPlan?.nombre || ""} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WhatsAppTab({ tenant, wa, saveWA, enabled, onTabChange }: { 
  tenant: Tenant; wa: WhatsAppConfig; saveWA: (w: Partial<WhatsAppConfig>) => void; enabled: boolean; onTabChange: (t: string) => void;
}) {
  const [draft, setDraft] = useState<WhatsAppConfig>(() => {
    const baseWa = { ...DEFAULT_CONFIG.whatsapp, ...wa };
    if (baseWa.base_url?.includes("wapisender")) {
      baseWa.base_url = "https://wasenderapi.com";
    }
    return {
      ...baseWa,
      plantilla_creada: wa.plantilla_creada || DEFAULT_CONFIG.whatsapp.plantilla_creada,
      plantilla_lista: wa.plantilla_lista || DEFAULT_CONFIG.whatsapp.plantilla_lista,
      plantilla_entregada: wa.plantilla_entregada || DEFAULT_CONFIG.whatsapp.plantilla_entregada,
    };
  });
  const [testPhone, setTestPhone] = useState(tenant.telefono || "");
  const [sending, setSending] = useState(false);

  async function probar() {
    setSending(true);
    saveWA(draft);
    const ordenDemo = {
      id: "demo", tenant_id: tenant.id, numero: "KL-202605-0003", cliente_id: "demo",
      empleado_id: "demo", servicios: [], 
      items: [
        { descripcion: "Body de bebé", cantidad: 1, precio_unitario: 70 },
        { descripcion: "Manta de bebé", cantidad: 1, precio_unitario: 140 },
        { descripcion: "Camisa manga corta", cantidad: 1, precio_unitario: 150 },
        { descripcion: "Camisa manga larga", cantidad: 1, precio_unitario: 180 }
      ], 
      subtotal: 540, itbis: 0, descuento: 0,
      total: 540, pagado: 540, saldo: 0, metodo_pago: "EFECTIVO", estado: "RECIBIDA",
      fecha_entrega: "11/5/2026",
      es_urgente: false,
      creado_en: new Date().toISOString(),
    } as any;
    const cliDemo = { 
      id: "demo", 
      tenant_id: tenant.id, 
      nombre: "Yeri", 
      telefono: testPhone, 
      direccion: "Los Arroyos Del Norte #51",
      tipo: "REGULAR", 
      limite_credito: 0, 
      creado_en: "" 
    } as any;
    const tenantDraft = { ...tenant, config: { ...(tenant.config || {}), whatsapp: draft } } as Tenant;
    const r = await notificarWhatsApp(tenantDraft, cliDemo, ordenDemo, "creada");
    setSending(false);
    if (r.ok) toast.success("Mensaje enviado ✓");
    else toast.error("Error: " + (r.reason || "desconocido"));
  }

  if (!enabled) {
    return (
      <div className="flex justify-center py-6">
        <Card className="w-full max-w-md p-8 border border-dashed border-primary/20 bg-primary/5 text-center rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <MessageCircle className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl mb-2 font-bold">Módulo de WhatsApp</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Envía avisos automáticos y fideliza a tus clientes. 
            Esta función está disponible solo en planes superiores.
          </p>
          <Button className="w-full rounded-xl font-bold h-11" onClick={() => onTabChange("plan")}>
            Ver planes disponibles
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <Card className={CARD + " relative overflow-hidden"}>
      {/* Barra de progreso de uso */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Uso Mensual de WhatsApp</span>
            <span className="text-xs font-bold text-primary">
              {tenant.whatsapp_sent_month || 0} / {(getTenantPlan(tenant).limite_whatsapp_mes || 0).toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                ((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) > 0.9 ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, ((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) > 0.8 && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold animate-pulse">LÍMITE CERCA</span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] rounded-lg font-bold border-primary/20 hover:bg-primary/5"
            onClick={() => onTabChange("plan")}
          >
            MEJORAR PLAN
          </Button>
        </div>
      </div>

      <div className="p-6 pt-6">
      <div>
        <div className="mb-8 flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl">Notificaciones WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Envía avisos automáticos a tus clientes desde tu propio número. Powered by{" "}
              <a className="text-primary underline" href="https://wasenderapi.com/api-docs" target="_blank" rel="noreferrer">WASenderAPI</a>.
            </p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="API Token (Personal Access Token)" span>
            <Input className={FIELD} type="password" placeholder="Tu token de wasenderapi.com" value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} />
          </Field>
          <Field label="Session ID / Instance (Opcional)" hint="Solo si usas múltiples sesiones.">
            <Input className={FIELD} placeholder="default" value={draft.instance} onChange={(e) => setDraft({ ...draft, instance: e.target.value })} />
          </Field>
          <Field label="Base URL (Servidor)">
            <Input className={FIELD} placeholder="https://wasenderapi.com" value={draft.base_url || ""} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} />
          </Field>
        </div>

        {/* Webhook Configuration for Incoming Messages */}
        <div className="mt-6 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Enlace de Webhook para Mensajes Entrantes</h4>
              <p className="text-[11px] text-muted-foreground font-sans">Configura este enlace en tu panel de WASenderAPI para recibir los mensajes entrantes de tus clientes.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border rounded-xl p-2.5 shadow-sm">
            <code className="flex-1 text-[11px] font-mono break-all text-slate-600 dark:text-slate-400 select-all leading-normal px-1">
              {`${import.meta.env.VITE_SUPABASE_URL || "https://lqtjwcphidbwiwrnqbac.supabase.co"}/functions/v1/whatsapp-webhook?tenant_id=${tenant.id}`}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 border-slate-200/80"
              onClick={() => {
                const urlStr = `${import.meta.env.VITE_SUPABASE_URL || "https://lqtjwcphidbwiwrnqbac.supabase.co"}/functions/v1/whatsapp-webhook?tenant_id=${tenant.id}`;
                navigator.clipboard.writeText(urlStr);
                toast.success("¡Enlace de Webhook copiado!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal font-sans">
            <strong>Instrucciones:</strong> Ve a tu sesión en wasenderapi.com, edítala, activa la casilla de "Webhook" y pega este enlace. Asegúrate de habilitar los eventos <code className="bg-emerald-100 dark:bg-emerald-950 px-1 rounded font-mono">messages.received</code> o <code className="bg-emerald-100 dark:bg-emerald-950 px-1 rounded font-mono">messages.upsert</code>.
          </p>
        </div>

        <div className="mt-8">
          <Label className={LABEL}>Eventos automáticos</Label>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              { k: "notif_orden_creada", label: "Al crear orden" },
              { k: "notif_orden_lista", label: "Cuando esté lista" },
              { k: "notif_orden_entregada", label: "Al entregar" },
            ].map((it) => (
              <label key={it.k} className="flex items-center justify-between rounded-xl border border-input p-4 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium">{it.label}</span>
                <Switch
                  checked={(draft as any)[it.k]}
                  onCheckedChange={(v) => setDraft({ ...draft, [it.k]: v } as WhatsAppConfig)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <Field label="Plantilla — Orden creada" hint="Variables: {lavanderia} {lavanderia_tel} {lavanderia_dir} {numero} {fecha} {cliente} {cliente_tel} {cliente_dir} {detalle} {subtotal} {total} {metodo_pago} {pagado} {saldo} {entrega} {estado} {web_url} {ticket_pie} {ticket_nota}">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_creada} onChange={(e) => setDraft({ ...draft, plantilla_creada: e.target.value })} />
          </Field>
          <Field label="Plantilla — Orden lista">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_lista} onChange={(e) => setDraft({ ...draft, plantilla_lista: e.target.value })} />
          </Field>
          <Field label="Plantilla — Orden entregada">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_entregada} onChange={(e) => setDraft({ ...draft, plantilla_entregada: e.target.value })} />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl bg-muted/30 p-6 border border-border/50">
          <Field label="Probar al número">
            <Input className={FIELD + " w-56 bg-background"} value={testPhone} onChange={(e) => setTestPhone(formatPhoneRD(e.target.value))} placeholder="829-000-0000" />
          </Field>
          <Button variant="outline" className="h-11 rounded-xl font-bold" disabled={sending || !draft.api_key} onClick={probar}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar prueba
          </Button>
          <div className="flex-1" />
          <Button className="mt-4 rounded-xl font-bold h-11 px-8" onClick={() => saveWA(draft)}>
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  </Card>
);
}

function PlanBadge({ id }: { id: string }) {
  const configs: any = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const config = configs[id] || { label: id, className: "" };
  return (
    <span className={`px-3 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-widest border ${config.className}`}>
      {config.label}
    </span>
  );
}

function SubscriptionModal({ open, onOpenChange, plan, period, bank, tenant, onSuccess }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: Plan | null;
  period: "monthly" | "yearly";
  bank?: BankDetails;
  tenant: Tenant;
  onSuccess: () => void;
}) {
  if (!plan) return null;

  const price = period === "monthly" ? plan.precio_mensual : (plan.precio_anual || plan.precio_mensual * 12 * 0.85);
  const polarUrl = period === "monthly" ? plan.polar_product_monthly_url : plan.polar_product_yearly_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[1.5rem] border-none shadow-elegant p-0 overflow-hidden">
        <div className="bg-gradient-primary p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-16 w-16 rotate-12" />
          </div>
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Pasarela de Pago Segura</div>
            <h2 className="text-2xl font-display leading-tight">Suscripción {plan.nombre}</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatRD(price).replace("DOP", "RD$")}</span>
              <span className="text-xs opacity-70">/{period === "monthly" ? "mes" : "año"}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-surface">
          <div className="grid grid-cols-1 gap-3">
            {/* OPCIÓN 1: TARJETA */}
            <button 
              onClick={() => {
                if (polarUrl) {
                  const checkoutUrl = new URL(polarUrl);
                  checkoutUrl.searchParams.set('customer_email', tenant.email);
                  window.open(checkoutUrl.toString(), "_blank");
                  toast.info("Esperando confirmación de pago...", {
                    description: "Una vez completado el pago en Polar, tu plan se activará automáticamente.",
                    duration: 6000
                  });
                } else {
                  toast.error("Enlace de pago no configurado para este plan.");
                }
              }}
              className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-primary/10 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-base text-foreground mb-0.5">Pago con Tarjeta</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Débito o Crédito vía Polar.sh</div>
              </div>
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-3 w-3 text-primary" />
              </div>
            </button>

            {/* OPCIÓN 2: TRANSFERENCIA */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-border bg-surface hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-foreground mb-0.5">Transferencia</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Pago directo a cuenta local</div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden">
                <div className="p-8">
                  <AlertDialogHeader className="mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-display">Datos Bancarios</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm leading-relaxed">
                      Realiza la transferencia y envíanos el comprobante por WhatsApp para activar tu plan de inmediato.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {bank ? (
                    <div className="bg-accent/40 rounded-3xl p-6 space-y-5 border border-border/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Building2 className="h-20 w-20" />
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Institución Bancaria</div>
                        <div className="font-bold text-lg flex items-center justify-between">
                          {bank.banco}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.banco); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Número de Cuenta</div>
                        <div className="font-mono text-2xl font-bold flex items-center justify-between text-primary tracking-tighter">
                          {bank.numero_cuenta}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.numero_cuenta); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 relative">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Tipo</div>
                          <div className="font-bold text-sm">{bank.tipo_cuenta}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">RNC / Cédula</div>
                          <div className="font-bold text-sm">{bank.rnc}</div>
                        </div>
                      </div>
                      <div className="space-y-1 border-t border-border/50 pt-4 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Titular de la Cuenta</div>
                        <div className="font-bold text-sm uppercase tracking-wide">{bank.titular}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-accent/20 rounded-3xl border border-dashed border-border/50">
                      <p className="text-sm text-muted-foreground">Los datos bancarios no han sido configurados por el administrador.</p>
                    </div>
                  )}

                  <div className="grid gap-2 mt-6">
                    <Button 
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold h-11 shadow-md shadow-[#25D366]/10 text-sm transition-transform active:scale-95"
                      onClick={() => {
                        const text = encodeURIComponent(`Hola Klynn, acabo de realizar la transferencia para el plan ${plan.nombre} (${tenant.nombre}). Aquí envío el comprobante.`);
                        window.open(`https://wa.me/18299416546?text=${text}`, "_blank");
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> ENVIAR COMPROBANTE
                    </Button>
                    <AlertDialogCancel className="w-full rounded-xl border-none bg-accent/50 h-10 font-bold text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Cerrar</AlertDialogCancel>
                  </div>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-center text-[10px] text-muted-foreground px-6 pb-6 leading-relaxed">
            Al suscribirte aceptas nuestros <Link to="/terminos" className="underline hover:text-primary">Términos de Servicio</Link> y <Link to="/privacidad" className="underline hover:text-primary">Políticas de Privacidad</Link>. 
            Los cargos se realizarán mensualmente de forma automática.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuccessModal({ open, onOpenChange, planName }: { open: boolean; onOpenChange: (o: boolean) => void; planName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-elegant text-center p-0 overflow-hidden bg-surface">
        <div className="h-32 bg-gradient-to-br from-success/20 via-success/5 to-transparent relative">
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center rotate-12 relative -bottom-10 border border-success/10">
                <CheckCircle2 className="h-10 w-10 text-success" />
             </div>
          </div>
        </div>
        
        <div className="p-10 pt-16 flex flex-col items-center">
          <h2 className="text-3xl font-display mb-3 text-foreground">¡Suscripción Activada!</h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed max-w-[280px]">
            Tu lavandería ahora tiene acceso total al plan <strong className="text-primary font-bold">{planName}</strong>. 
            ¡Prepárate para llevar tu negocio al siguiente nivel!
          </p>
          
          <div className="w-full p-5 bg-accent/30 rounded-3xl mb-10 border border-border/50 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Nuevos beneficios</span>
            </div>
            <ul className="text-xs space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Acceso ilimitado a reportes avanzados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Mayor capacidad de órdenes y empleados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Soporte VIP vía WhatsApp en minutos</li>
            </ul>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-gradient-primary text-white rounded-[1.5rem] h-16 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            Comenzar Experiencia Premium
          </Button>
          
          <button 
            onClick={() => onOpenChange(false)}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline underline-offset-4"
          >
            Cerrar esta ventana
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FiscalTab({ tenant, config, sequences, onRefresh, enabled, onTabChange }: { 
  tenant: Tenant; config: ECFConfig | null; sequences: ECFSequence[]; onRefresh: () => void; enabled: boolean; onTabChange: (t: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showNewSeq, setShowNewSeq] = useState(false);
  const [dialogMode, setDialogMode] = useState<'electronic' | 'traditional'>('electronic');
  const [deleteSeqId, setDeleteSeqId] = useState<string | null>(null);
  
  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;

  // Local state for WhatsApp alert phone (saves on blur, not on every keystroke)
  const [alertPhone, setAlertPhone] = useState(cfg.alerta_ncf_telefono || "");
  useEffect(() => { setAlertPhone(cfg.alerta_ncf_telefono || ""); }, [cfg.alerta_ncf_telefono]);
  
  // Local state for instant and responsive tab switching
  const [localIsElectronic, setLocalIsElectronic] = useState(!!config?.is_active);
  const isElectronic = localIsElectronic;

  const [draft, setDraft] = useState<Partial<ECFConfig>>(config || {
    tenant_id: tenant.id,
    rnc_emisor: tenant.rnc || "",
    razon_social: tenant.nombre,
    ambiente: "pruebas",
    is_active: false
  });

  // Keep state synchronized when parent query finishes loading config
  useEffect(() => {
    if (config) {
      setDraft(config);
      setLocalIsElectronic(!!config.is_active);
    }
  }, [config]);

  async function saveECF(overrideActive?: boolean) {
    setLoading(true);
    try {
      const activeValue = overrideActive !== undefined ? overrideActive : !!draft.is_active;
      // Si empieza con SBX, no limpiamos las letras. Si no, limpiamos solo guiones.
      const isSandboxRNC = draft.rnc_emisor?.toUpperCase().startsWith('SBX');
      const cleanRNC = isSandboxRNC 
        ? draft.rnc_emisor?.toUpperCase() 
        : (draft.rnc_emisor ? draft.rnc_emisor.replace(/\D/g, '') : '');
      
      // 1. Guardar la config electrónica
      await saveECFConfig({
        ...draft,
        is_active: activeValue,
        rnc_emisor: cleanRNC,
        id: config?.id || crypto.randomUUID(),
        tenant_id: tenant.id,
        updated_at: new Date().toISOString(),
        created_at: config?.created_at || new Date().toISOString(),
      } as ECFConfig);

      // 2. Si es electrónico y no tiene ID de Pronesoft (o tiene el temporal de sandbox), registrar
      let pTenantId = config?.pronesoft_tenant_id;
      if (activeValue && (!pTenantId || pTenantId === 'sandbox-tenant')) {
        toast.info("Registrando negocio en el servidor de certificación...");
        pTenantId = await registerTenantInPronesoft(tenant.id);
      }

      // 3. Si hay un certificado nuevo para subir (Solo en producción, Sandbox no lo requiere)
      if (activeValue && draft.ambiente === 'produccion' && draft.certificate_data && draft.certificate_password) {
        toast.info("Sincronizando certificado digital...");
        await uploadCertificateToPronesoft(tenant.id, draft.certificate_data, draft.certificate_password);
        // Limpiar la data del certificado del estado (ya se subió)
        setDraft(d => ({ ...d, certificate_data: undefined }));
      }

      // 4. IMPORTANTÍSIMO: Guardar también el RNC en el tenant base para que los tickets lo usen
      await saveTenant({ ...tenant, rnc: cleanRNC } as Tenant);

      toast.success("Datos fiscales guardados y sincronizados correctamente");
      onRefresh();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
    setLoading(false);
  }

  async function updateCfg(c: Partial<TenantConfig>) {
    const next: Tenant = { ...tenant, config: { ...cfg, ...c } } as Tenant;
    await saveTenant(next);
    toast.success("Ajustes fiscales actualizados");
  }

  async function testConnection() {
    setLoading(true);
    try {
      const proneSoftEnv = config?.ambiente === 'pruebas' ? 'sandbox' : config?.ambiente === 'produccion' ? 'production' : undefined;
      const client = getProneSoftClient(
        config?.pronesoft_tenant_id, 
        proneSoftEnv,
        draft.usar_credenciales_propias ? draft.pronesoft_client_id : undefined,
        draft.usar_credenciales_propias ? draft.pronesoft_client_secret : undefined
      );
      const res = await client.testConnection();
      if (res.ok) {
        toast.success("¡Conexión con Pronesoft exitosa! ✓");
      } else {
        toast.error("Error al conectar: " + (res?.message || "Credenciales inválidas"));
      }
    } catch (err: any) {
      toast.error("Error de conexión con Pronesoft: " + err.message);
    }
    setLoading(false);
  }

  // Quick mute / unmute toggle for sequences alerts
  async function toggleSequenceAlert(seq: ECFSequence) {
    try {
      const nextAlertState = seq.recibir_alertas === false ? true : false;
      await saveECFSequence({
        ...seq,
        recibir_alertas: nextAlertState
      });
      toast.success(nextAlertState ? "🔔 Alertas de WhatsApp activadas" : "🔕 Alertas silenciadas para esta secuencia");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al actualizar alerta: " + err.message);
    }
  }

  async function deleteSequence(seqId: string) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta secuencia fiscal? Esta acción no se puede deshacer y podría afectar la numeración de tus facturas si no configuras otra de inmediato.")) {
      return;
    }
    try {
      await deleteECFSequence(seqId);
      toast.success("Secuencia eliminada correctamente");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al eliminar la secuencia: " + err.message);
    }
  }

  // Traditional NCF sequences
  const tradSequences = sequences.filter(s => s.tipo_ecf.startsWith('B') || s.prefijo === 'B');
  // Electronic e-CF sequences
  const elecSequences = sequences.filter(s => s.tipo_ecf.startsWith('E') || s.prefijo === 'E');

  if (!enabled) {
    return (
      <div className="flex justify-center py-6">
        <Card className="w-full max-w-md p-8 border border-dashed border-primary/20 bg-primary/5 text-center rounded-3xl shadow-sm">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display mb-2 font-bold">Módulo Fiscal Avanzado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            La gestión de RNC, ITBIS y Comprobantes Fiscales (NCF/e-CF) requiere el plan **Enterprise**.
          </p>
          <Button className="rounded-xl font-bold h-11 px-6" onClick={() => onTabChange("plan")}>
            Mejorar Plan
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* 1. Configuración de Impuestos (ITBIS) */}
        <Card className={CARD}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-display">Configuración de Impuestos</h3>
              <p className="text-xs text-muted-foreground">Define el ITBIS y cómo se aplica a tus precios.</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="ITBIS (%)">
              <Input 
                className={FIELD} 
                type="number" 
                value={cfg.itbis_porcentaje} 
                onChange={(e) => updateCfg({ itbis_porcentaje: Number(e.target.value) })} 
              />
            </Field>
            <label className="flex items-center justify-between rounded-md border border-input p-3 bg-primary/5 border-primary/20 h-fit self-end">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-primary">Precios incluyen ITBIS</span>
                <p className="text-[10px] text-muted-foreground">Si está activo, el ITBIS se desglosará internamente del total de la orden.</p>
              </div>
              <Switch checked={cfg.itbis_incluido} onCheckedChange={(v) => updateCfg({ itbis_incluido: v })} />
            </label>
          </div>
        </Card>

        {/* 2. Selector de Modo de Facturación */}
        <Card className={CARD + " border-primary/20 bg-primary/5"}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${isElectronic ? "bg-primary text-white shadow-glow" : "bg-white text-slate-400 border"}`}>
                {isElectronic ? <Sparkles className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-display">Modo de Facturación</h3>
                  {isElectronic && (
                    <Button variant="ghost" size="sm" asChild className="h-6 text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full font-bold">
                      <Link to={`/t/${tenant.slug}/fiscal-homologacion`}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Panel de Homologación
                      </Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isElectronic 
                    ? "Estás utilizando Facturación Electrónica (e-CF) conectada con DGII." 
                    : "Estás utilizando Comprobantes Fiscales tradicionales (NCF)."}
                </p>
                {isElectronic && (
                  <button 
                    onClick={testConnection} 
                    disabled={loading}
                    className="mt-3 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    PROBAR CONEXIÓN CON PRONESOFT
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex p-1 bg-white rounded-xl border shadow-sm">
              <button 
                onClick={async () => {
                  setLocalIsElectronic(false);
                  setDraft(d => ({ ...d, is_active: false }));
                  await updateCfg({ ncf_facturacion_activa: true });
                  await saveECF(false);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!isElectronic ? "bg-primary text-white" : "hover:bg-slate-50"}`}
              >
                TRADICIONAL (NCF)
              </button>
              <button 
                onClick={async () => {
                  setLocalIsElectronic(true);
                  setDraft(d => ({ ...d, is_active: true }));
                  await updateCfg({ ncf_facturacion_activa: true });
                  await saveECF(true);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isElectronic ? "bg-primary text-white" : "hover:bg-slate-50"}`}
              >
                ELECTRÓNICA (e-CF)
              </button>
            </div>
          </div>
      </Card>

      {/* 3. Contenido según el modo */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna Izquierda: Datos del Emisor y NCF/Certificado */}
          <div className="space-y-6">
            <Card className={CARD}>
              <h3 className="text-lg font-display mb-4">Datos del Contribuyente</h3>
              <div className="space-y-4">
                <Field label="RNC / Cédula">
                  <Input 
                    className={FIELD} 
                    value={draft.rnc_emisor} 
                    onChange={(e) => setDraft({ ...draft, rnc_emisor: e.target.value.toUpperCase() })} 
                    placeholder="Ej: SBX123456 o 402-..."
                  />
                </Field>
                <Field label="Nombre o Razón Social">
                  <Input 
                    className={FIELD} 
                    value={draft.razon_social} 
                    onChange={(e) => setDraft({ ...draft, razon_social: e.target.value })} 
                  />
                </Field>
                
                {isElectronic && (
                  <Field label="Ambiente DGII" hint="Pruebas o Producción.">
                    <Select value={draft.ambiente} onValueChange={(v: any) => setDraft({ ...draft, ambiente: v })}>
                      <SelectTrigger className={FIELD}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="pruebas" className="cursor-pointer">
                          <span className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-amber-500" />
                            <span>PRUEBAS</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="produccion" className="cursor-pointer">
                          <span className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            <span>PRODUCCIÓN</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {isElectronic && (
                  <div className="space-y-4 pt-4 pb-2 border-y">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                          <Key className="h-4 w-4 text-primary" /> Usar credenciales propias (Pronesoft)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Activa esta opción si tienes tu propia cuenta en Pronesoft.
                        </div>
                      </div>
                      <Switch 
                        checked={!!draft.usar_credenciales_propias} 
                        onCheckedChange={(v) => setDraft({ ...draft, usar_credenciales_propias: v })} 
                      />
                    </div>
                    
                    {draft.usar_credenciales_propias && (
                      <div className="space-y-4 pt-2">
                        <Field label="Client ID (Pronesoft)">
                          <Input 
                            type="password"
                            className={FIELD} 
                            value={draft.pronesoft_client_id || ""} 
                            onChange={(e) => setDraft({ ...draft, pronesoft_client_id: e.target.value })} 
                            placeholder="app_live_..."
                          />
                        </Field>
                        <Field label="Client Secret (Pronesoft)">
                          <Input 
                            type="password"
                            className={FIELD} 
                            value={draft.pronesoft_client_secret || ""} 
                            onChange={(e) => setDraft({ ...draft, pronesoft_client_secret: e.target.value })} 
                            placeholder="sk_live_..."
                          />
                        </Field>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Estas credenciales se guardan de forma segura en tu tenant de Klynn. Puedes encontrarlas en tu panel de Pronesoft.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mostrar RNC en Ticket Switch */}
                <div className="flex items-center justify-between p-3 border rounded-xl bg-accent/5">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold">Mostrar RNC en Ticket</div>
                    <div className="text-xs text-muted-foreground">Imprimir el RNC del contribuyente en todos los comprobantes impresos.</div>
                  </div>
                  <Switch checked={cfg.ticket_mostrar_rnc} onCheckedChange={(v) => updateCfg({ ticket_mostrar_rnc: v })} />
                </div>
                
                <Button className="w-full h-11 rounded-xl font-bold font-display" onClick={() => saveECF()} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Datos Fiscales
                </Button>
              </div>
            </Card>

            {!isElectronic ? (
              <Card className={CARD + " bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-none shadow-2xl relative overflow-hidden"}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold font-display">Normativa Fiscal NCF</h3>
                </div>
                <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    Estás operando en el modo de <strong>Comprobantes Fiscales tradicionales (NCF)</strong> de la DGII.
                  </p>
                  <p>
                    En este modo, las facturas se emiten localmente y se reportan mes a mes a través de la Oficina Virtual. Las secuencias se configuran y descuentan de forma puramente digital dentro de Klynn.
                  </p>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Administra todos tus rangos de comprobantes autorizados y activa alertas inteligentes en tiempo real desde el gestor dinámico de la derecha.</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className={CARD}>
                <h3 className="text-lg font-display mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> Certificado Digital (.p12)
                </h3>
                {draft.ambiente === 'pruebas' ? (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                    <p className="text-sm text-emerald-700">
                      <strong>No necesitas subir un certificado P12 real.</strong><br/>
                      El entorno de Pruebas (Sandbox) de Pronesoft genera uno internamente de forma automática.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {draft.certificate_data || config?.certificate_data ? (
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                        <div className="flex items-center gap-3 text-emerald-700 font-bold mb-1">
                          <CheckCircle2 className="h-5 w-5" /> Cargado y Listo
                        </div>
                        <p className="text-[10px] text-emerald-600">Certificado P12 adjunto.</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 text-center">
                        <p className="text-xs text-amber-700">Pendiente de subir certificado.</p>
                      </div>
                    )}
                    <Field label="Contraseña del .p12">
                      <Input type="password" className={FIELD} value={draft.certificate_password || ""} onChange={(e) => setDraft({ ...draft, certificate_password: e.target.value })} />
                    </Field>
                    <input type="file" id="cert-upload" className="hidden" accept=".p12,.pfx" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const base64 = ev.target?.result?.toString().split(',')[1];
                          setDraft({ ...draft, certificate_data: base64 });
                          toast.success("Certificado listo");
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => document.getElementById('cert-upload')?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Subir Archivo
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Columna Derecha: Alertas de WhatsApp y Listado de Secuencias */}
          <div className="space-y-6">
            
            {/* Alerta de Secuencias (WhatsApp notification number config) */}
            <Card className={CARD}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display">Alerta de Secuencias</h3>
                    <p className="text-xs text-muted-foreground">Recibe alertas por WhatsApp cuando tus secuencias estén próximas a agotarse.</p>
                  </div>
                </div>
                
                {/* Botón de envío de prueba premium */}
                <button
                  onClick={async () => {
                    if (!alertPhone) {
                      toast.error("Por favor, ingresa un número de WhatsApp de alerta primero");
                      return;
                    }
                    const wa = cfg.whatsapp;
                    if (!wa?.api_key) {
                      toast.error("WhatsApp no está configurado en tu pestaña de WhatsApp");
                      return;
                    }
                    
                    const promise = (async () => {
                      const cleanPhone = alertPhone.replace(/\D/g, "");
                      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
                      const base = (wa.base_url || "https://wasenderapi.com").replace(/\/$/, "");
                      const url = `${base}/api/send-message`;
                      
                      const res = await fetch(url, {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json", 
                          "Authorization": `Bearer ${wa.api_key}`,
                          "Accept": "application/json"
                        },
                        body: JSON.stringify({ 
                          to: formattedPhone, 
                          text: `*🚨 ALERTA FISCAL: SECUENCIA PRÓXIMA A AGOTARSE*\n\nEstimado cliente, te informamos que la secuencia fiscal de tu negocio está a punto de agotarse:\n\n• *Tipo de NCF:* B02 - CONSUMIDOR FINAL\n• *Rango Restante:* 8 comprobantes disponibles (Límite configurado: 50)\n• *Último Emitido:* B0200000042\n• *Fecha de Vencimiento:* 31/12/2026\n\n*Recomendación:* Solicita un nuevo rango de comprobantes en la Oficina Virtual de la DGII de inmediato para evitar interrupciones en tu facturación.\n\n_Mensaje automático de prueba generado desde Klynn._`,
                          instance_id: wa.instance
                        }), 
                      });
                      
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.message || `HTTP ${res.status}`);
                      }
                    })();

                    toast.promise(promise, {
                      loading: "Enviando alerta de prueba...",
                      success: "¡Alerta de prueba enviada con éxito! ✓",
                      error: (err) => `Error al enviar: ${err.message}`
                    });
                  }}
                  className="px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 flex items-center gap-1.5 text-[10px] font-sans font-bold transition-all active:scale-95 shadow-sm"
                  title="Enviar un mensaje de WhatsApp de prueba a este número"
                >
                  <Send className="h-3 w-3" />
                  PROBAR
                </button>
              </div>
              <div className="space-y-4">
                <Field label="Número de WhatsApp de Alerta" hint="Ingresa el número con el código de país (Ej: 18091234567)">
                  <Input 
                    className={FIELD} 
                    placeholder="Ej: 18091234567" 
                    value={alertPhone} 
                    onChange={(e) => setAlertPhone(e.target.value)} 
                    onBlur={() => updateCfg({ alerta_ncf_telefono: alertPhone })}
                  />
                </Field>
              </div>
            </Card>

            {!isElectronic ? (
              // Traditional NCF Sequences manager
              <Card className={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display">Secuencias NCF</h3>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      id="import-excel-traditional" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            try {
                              const arrayBuffer = ev.target?.result as ArrayBuffer;
                              const XLSX = await import('xlsx');
                              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                              const sheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[sheetName];
                              const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                              toast.info(`Procesando ${jsonData.length} filas del Excel de la DGII...`);
                              
                              let importedCount = 0;
                              for (const row of jsonData) {
                                // Mapeo de columnas DGII tolerante e insensible a mayúsculas
                                const rawTipo = row["Tipo"] || row["tipo"] || row["Tipo Comprobante"] || row["Tipo de Comprobante"] || row["CODI_COMI"];
                                const rawDesde = row["Desde"] || row["desde"] || row["Secuencia Inicial"] || row["Rango Inicial"] || row["Inicio"] || row["SECU_INIC"];
                                const rawHasta = row["Hasta"] || row["hasta"] || row["Secuencia Final"] || row["Rango Final"] || row["Fin"] || row["SECU_FINA"];
                                const rawActual = row["Actual"] || row["actual"] || row["Último Emitido"] || row["Último"] || row["Valor Actual"] || 0;
                                const rawVencimiento = row["Vencimiento"] || row["vencimiento"] || row["Fecha Vencimiento"] || row["Fecha de Vencimiento"] || row["Vence"] || row["FECH_VENC"];

                                if (rawTipo && rawDesde && rawHasta) {
                                  const tipo = String(rawTipo).trim().toUpperCase();
                                  if (tipo.startsWith('B')) {
                                    const seqId = crypto.randomUUID();
                                    await saveECFSequence({
                                      id: seqId,
                                      tenant_id: tenant.id,
                                      tipo_ecf: tipo,
                                      prefijo: 'B',
                                      valor_inicial: Number(rawDesde),
                                      valor_final: Number(rawHasta),
                                      valor_actual: Number(rawActual),
                                      expiration_date: rawVencimiento ? new Date(rawVencimiento).toISOString().split('T')[0] : undefined,
                                      is_active: true,
                                      recibir_alertas: false, // Desactivadas por defecto
                                      alerta_limite: 50
                                    });
                                    importedCount++;
                                  }
                                }
                              }
                              
                              if (importedCount > 0) {
                                toast.success(`Se importaron ${importedCount} secuencias NCF con éxito`);
                                onRefresh();
                              } else {
                                toast.warn("No se encontraron secuencias tradicionales válidas (que inicien con 'B') en el archivo.");
                              }
                            } catch (err: any) {
                              toast.error("Error al leer Excel: " + err.message);
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        }
                      }} 
                    />
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-9 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 hover:text-emerald-800 text-xs font-semibold px-3.5 shadow-sm transition-all active:scale-95 duration-200"
                      onClick={() => document.getElementById('import-excel-traditional')?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5 stroke-[2.5]" /> Importar
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-9 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary-dark text-xs font-semibold px-3.5 shadow-sm transition-all active:scale-95 duration-200" 
                      onClick={() => {
                        setDialogMode('traditional');
                        setShowNewSeq(true);
                      }}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5 stroke-[2.5]" /> Añadir
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {tradSequences.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-xs border border-dashed rounded-xl">No hay secuencias NCF tradicionales creadas.</div>
                  ) : (
                    tradSequences.map(seq => {
                      const remaining = seq.valor_final - seq.valor_actual;
                      const threshold = seq.alerta_limite ?? 50;
                      const isLow = remaining <= threshold;
                      const hasAlertEnabled = seq.recibir_alertas !== false;

                      return (
                        <div key={seq.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition-all">
                          <div>
                            <div className="text-xs font-bold font-mono flex items-center gap-1.5">
                              <span className="text-primary">{seq.tipo_ecf}{NCF_NOMBRES[seq.tipo_ecf] ? ` - ${NCF_NOMBRES[seq.tipo_ecf]}` : ''}</span>
                              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[8px] h-3.5 border-none">NCF</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {seq.prefijo}{seq.tipo_ecf}{String(seq.valor_actual).padStart(8, '0')}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`text-xs font-bold ${isLow ? 'text-red-500 animate-pulse font-extrabold' : 'text-emerald-600'}`}>
                                {remaining} disp.
                              </div>
                              <div className="text-[9px] text-muted-foreground font-sans">
                                Alerta: {threshold}
                              </div>
                            </div>
                            
                            {/* Actions Group (Bell and Trash) */}
                            <div className="flex items-center gap-1.5">
                              {/* Quick Mute Bell Toggle Button */}
                              <button 
                                onClick={() => toggleSequenceAlert(seq)}
                                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all active:scale-90 ${
                                  hasAlertEnabled 
                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-sm shadow-primary/5 hover:bg-primary/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                                title={hasAlertEnabled ? "Alertas de WhatsApp activadas. Clic para silenciar." : "Alertas desactivadas. Clic para activar."}
                              >
                                {hasAlertEnabled ? <Bell className="h-3.5 w-3.5 animate-pulse" /> : <BellOff className="h-3.5 w-3.5 opacity-60" />}
                              </button>

                              {/* Trash/Delete Sequence Button */}
                              <button 
                                onClick={() => setDeleteSeqId(seq.id)}
                                className="h-8 w-8 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 shadow-sm"
                                title="Eliminar esta secuencia permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            ) : (
              // Electronic sequences card
              <Card className={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display">Secuencias e-NCF</h3>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      id="import-excel" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = ev.target?.result?.toString().split(',')[1];
                            if (base64) {
                              toast.promise(importSequencesToPronesoft(tenant.id, base64), {
                                loading: "Importando secuencias desde Excel...",
                                success: () => {
                                  onRefresh();
                                  return "Secuencias importadas correctamente";
                                },
                                error: (err) => "Error al importar: " + err.message
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-9 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 hover:text-emerald-800 text-xs font-semibold px-3.5 shadow-sm transition-all active:scale-95 duration-200"
                      onClick={() => document.getElementById('import-excel')?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5 stroke-[2.5]" /> Importar
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-9 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary-dark text-xs font-semibold px-3.5 shadow-sm transition-all active:scale-95 duration-200" 
                      onClick={() => {
                        setDialogMode('electronic');
                        setShowNewSeq(true);
                      }}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5 stroke-[2.5]" /> Añadir
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {elecSequences.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-xs border border-dashed rounded-xl">No hay secuencias e-CF creadas.</div>
                  ) : (
                    elecSequences.map(seq => {
                      const remaining = seq.valor_final - seq.valor_actual;
                      const threshold = seq.alerta_limite ?? 50;
                      const isLow = remaining <= threshold;
                      const hasAlertEnabled = seq.recibir_alertas !== false;

                      return (
                        <div key={seq.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition-all">
                          <div>
                            <div className="text-xs font-bold font-mono flex items-center gap-1.5">
                              <span className="text-primary">{seq.tipo_ecf}{NCF_NOMBRES[seq.tipo_ecf] ? ` - ${NCF_NOMBRES[seq.tipo_ecf]}` : ''}</span>
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[8px] h-3.5 border-none">e-CF</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {seq.prefijo}{seq.tipo_ecf}{String(seq.valor_actual).padStart(10, '0')}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`text-xs font-bold ${isLow ? 'text-red-500 animate-pulse font-extrabold' : 'text-emerald-600'}`}>
                                {remaining} disp.
                              </div>
                              <div className="text-[9px] text-muted-foreground font-sans">
                                Alerta: {threshold}
                              </div>
                            </div>
                            
                            {/* Actions Group (Bell and Trash) */}
                            <div className="flex items-center gap-1.5">
                              {/* Quick Mute Bell Toggle Button */}
                              <button 
                                onClick={() => toggleSequenceAlert(seq)}
                                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all active:scale-90 ${
                                  hasAlertEnabled 
                                    ? 'bg-primary/10 border-primary/20 text-primary shadow-sm shadow-primary/5 hover:bg-primary/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                                title={hasAlertEnabled ? "Alertas de WhatsApp activadas. Clic para silenciar." : "Alertas desactivadas. Clic para activar."}
                              >
                                {hasAlertEnabled ? <Bell className="h-3.5 w-3.5 animate-pulse" /> : <BellOff className="h-3.5 w-3.5 opacity-60" />}
                              </button>

                              {/* Trash/Delete Sequence Button */}
                              <button 
                                onClick={() => setDeleteSeqId(seq.id)}
                                className="h-8 w-8 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 shadow-sm"
                                title="Eliminar esta secuencia permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteSeqId} onOpenChange={(o) => !o && setDeleteSeqId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden bg-background">
          <div className="p-8">
            <AlertDialogHeader className="mb-6">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-2xl font-display text-slate-900">¿Eliminar secuencia?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-relaxed text-slate-500 font-sans mt-2">
                Esta acción no se puede deshacer y podría afectar la numeración de tus facturas si no configuras otra de inmediato.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel onClick={() => setDeleteSeqId(null)} className="rounded-xl border-none bg-slate-100 hover:bg-slate-200 h-9.5 font-bold text-[11px] text-slate-700 px-4 transition-all">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  if (deleteSeqId) {
                    try {
                      await deleteECFSequence(deleteSeqId);
                      toast.success("Secuencia eliminada correctamente");
                      onRefresh();
                    } catch (err: any) {
                      toast.error("Error al eliminar la secuencia: " + err.message);
                    } finally {
                      setDeleteSeqId(null);
                    }
                  }
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white h-9.5 font-bold text-[11px] px-5 shadow-md shadow-red-600/10 transition-all"
              >
                Eliminar Secuencia
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <NewSequenceDialog open={showNewSeq} onOpenChange={setShowNewSeq} tenantId={tenant.id} onCreated={onRefresh} mode={dialogMode} sequences={sequences} />
    </div>
  );
}

function NewSequenceDialog({ open, onOpenChange, tenantId, onCreated, mode = 'electronic', sequences = [] }: {
  open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; onCreated: () => void; mode?: 'electronic' | 'traditional'; sequences?: ECFSequence[];
}) {
  const [loading, setLoading] = useState(false);
  const [seq, setSeq] = useState<Partial<ECFSequence>>({
    tenant_id: tenantId,
    tipo_ecf: mode === 'traditional' ? "B02" : "E32",
    prefijo: mode === 'traditional' ? "B" : "E",
    valor_inicial: 1,
    valor_final: 100,
    valor_actual: 0,
    expiration_date: "",
    is_active: true,
    recibir_alertas: false, // Notification alerts disabled by default
    alerta_limite: 50
  });

  // Sync mode changes to reset initial state appropriately when modal triggers
  useEffect(() => {
    if (open) {
      setSeq({
        tenant_id: tenantId,
        tipo_ecf: mode === 'traditional' ? "B02" : "E32",
        prefijo: mode === 'traditional' ? "B" : "E",
        valor_inicial: 1,
        valor_final: 100,
        valor_actual: 0,
        expiration_date: "",
        is_active: true,
        recibir_alertas: false,
        alerta_limite: 50
      });
    }
  }, [open, mode, tenantId]);

  async function save() {
    setLoading(true);
    try {
      const tipo = seq.tipo_ecf;
      const existing = sequences.find(s => s.tipo_ecf === tipo);

      if (existing) {
        await deleteECFSequence(existing.id);
      }

      await saveECFSequence({
        ...seq,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        prefijo: mode === 'traditional' ? 'B' : 'E'
      } as ECFSequence);
      toast.success("Secuencia creada con éxito");
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          {/* Columna Izquierda Ilustrativa Premium (Gradient and Glow Split) */}
          <div className="md:col-span-5 bg-gradient-to-br from-primary via-primary/95 to-slate-900 text-white p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold font-display tracking-tight">Autorización DGII</h4>
                <p className="text-xs text-white/80 leading-relaxed font-sans">
                  Configura tus comprobantes fiscales {mode === 'traditional' ? 'Tradicionales (NCF)' : 'Electrónicos (e-CF)'} de acuerdo con la resolución aprobada por la DGII.
                </p>
              </div>
              
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">1</div>
                  <span className="text-[11px] text-white/90 font-sans">Prefijo {mode === 'traditional' ? '"B" para NCF' : '"E" para e-CF'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">2</div>
                  <span className="text-[11px] text-white/90 font-sans">Establece el rango desde/hasta</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">3</div>
                  <span className="text-[11px] text-white/90 font-sans">Define alertas de bajo inventario</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 relative z-10 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-sans">Conexión cifrada y segura</span>
            </div>
          </div>

          {/* Columna Derecha de Entrada */}
          <div className="md:col-span-7 p-6 bg-background flex flex-col justify-between">
            <div>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-display">{mode === 'traditional' ? "Nueva Secuencia NCF" : "Nueva Secuencia e-CF"}</DialogTitle>
                <DialogDescription className="text-xs">Establece los rangos de comprobantes autorizados.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3.5">
                <Field label="Tipo de Comprobante">
                  <Select value={seq.tipo_ecf} onValueChange={(v) => setSeq({ ...seq, tipo_ecf: v })}>
                    <SelectTrigger className="w-full h-11 rounded-lg"><SelectValue /></SelectTrigger>
                    {/* Fixed sideways expansion using popper position & strict width anchoring */}
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {mode === 'traditional' ? (
                        <>
                          <SelectItem value="B01">B01 - CRÉDITO FISCAL</SelectItem>
                          <SelectItem value="B02">B02 - CONSUMIDOR FINAL</SelectItem>
                          <SelectItem value="B03">B03 - NOTA DE DÉBITO</SelectItem>
                          <SelectItem value="B04">B04 - NOTA DE CRÉDITO</SelectItem>
                          <SelectItem value="B11">B11 - COMPRAS</SelectItem>
                          <SelectItem value="B13">B13 - GASTOS MENORES</SelectItem>
                          <SelectItem value="B14">B14 - REGÍMENES ESPECIALES</SelectItem>
                          <SelectItem value="B15">B15 - GUBERNAMENTAL</SelectItem>
                          <SelectItem value="B16">B16 - EXPORTACIONES</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="E31">E31 - CRÉDITO FISCAL</SelectItem>
                          <SelectItem value="E32">E32 - CONSUMIDOR FINAL</SelectItem>
                          <SelectItem value="E33">E33 - NOTA DE DÉBITO</SelectItem>
                          <SelectItem value="E34">E34 - NOTA DE CRÉDITO</SelectItem>
                          <SelectItem value="E41">E41 - COMPRAS</SelectItem>
                          <SelectItem value="E43">E43 - GASTOS MENORES</SelectItem>
                          <SelectItem value="E44">E44 - REGÍMENES ESPECIALES</SelectItem>
                          <SelectItem value="E45">E45 - GUBERNAMENTAL</SelectItem>
                          <SelectItem value="E46">E46 - EXPORTACIONES</SelectItem>
                          <SelectItem value="E47">E47 - PAGOS AL EXTERIOR</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                {(() => {
                  const tipo = seq.tipo_ecf;
                  const existing = sequences.find(s => s.tipo_ecf === tipo);
                  if (existing) {
                    const remaining = existing.valor_final - existing.valor_actual;
                    return (
                      <div className={`p-3 rounded-xl border text-[10px] font-sans leading-relaxed transition-all ${
                        remaining <= 0 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {remaining <= 0 ? (
                          <span>✓ La secuencia anterior de tipo <strong>{tipo}</strong> está agotada. Se eliminará automáticamente al crear esta nueva.</span>
                        ) : (
                          <span>⚠️ Ya tienes una secuencia activa para <strong>{tipo}</strong> con <strong>{remaining}</strong> comprobantes disponibles. Al guardar, se reemplazará automáticamente por esta nueva.</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Desde">
                    <Input type="number" className="h-10 rounded-lg" value={seq.valor_inicial} onChange={(e) => setSeq({ ...seq, valor_inicial: Number(e.target.value) })} />
                  </Field>
                  <Field label="Hasta">
                    <Input type="number" className="h-10 rounded-lg" value={seq.valor_final} onChange={(e) => setSeq({ ...seq, valor_final: Number(e.target.value) })} />
                  </Field>
                </div>
                
                <Field label="Valor Actual (Último emitido)">
                  <Input type="number" className="h-10 rounded-lg" value={seq.valor_actual} onChange={(e) => setSeq({ ...seq, valor_actual: Number(e.target.value) })} />
                </Field>
                
                <Field label="Fecha de Vencimiento">
                  <Input type="date" className="h-10 rounded-lg" value={seq.expiration_date} onChange={(e) => setSeq({ ...seq, expiration_date: e.target.value })} />
                </Field>

                {/* Recibir Alertas toggle - defaults to unchecked (false) */}
                <div className="p-3.5 rounded-2xl border bg-accent/5 flex items-center justify-between gap-4 mt-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Bell className="h-4 w-4 text-primary animate-pulse" /> Recibir alertas
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Aviso de WhatsApp por secuencia</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={seq.recibir_alertas === true} 
                    onChange={(e) => setSeq({ ...seq, recibir_alertas: e.target.checked })} 
                    className="h-5 w-5 accent-primary cursor-pointer rounded-lg border-gray-300"
                  />
                </div>

                {/* Conditional threshold input if alerts are checked */}
                {seq.recibir_alertas === true && (
                  <Field label="Límite para Alerta" hint="Recibe un WhatsApp cuando queden esta cantidad de comprobantes en el rango">
                    <Input 
                      type="number" 
                      className="h-10 rounded-lg"
                      value={seq.alerta_limite ?? 50} 
                      onChange={(e) => setSeq({ ...seq, alerta_limite: Number(e.target.value) })} 
                    />
                  </Field>
                )}
              </div>
            </div>
            
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" className="rounded-xl border-border hover:bg-accent" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={save} disabled={loading} className="rounded-xl font-bold">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Secuencia
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
