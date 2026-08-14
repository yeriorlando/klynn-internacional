import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Phone, Mail, MapPin, Trash2, Search, Loader2, CreditCard, Coins, Check, AlertTriangle, FileText, Building2, User, ArrowRight, ArrowLeft, Building, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { saveCliente, deleteCliente, formatPhoneRD, uid, type Cliente, saveOrden, saveMovimiento, formatRD, type Orden, type MetodoPago } from "@/lib/storage";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useOrdenes, useCajaAbierta } from "@/hooks/use-queries";
import { AddressAutocomplete } from "./logistica/AddressAutocomplete";

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  tenant: any;
  onDone: (cliente?: Cliente) => void;
}

export function ClienteDialog({ open, onOpenChange, cliente, tenant, onDone }: ClienteDialogProps) {
  const queryClient = useQueryClient();
  const user = useRequireAuth();
  
  const { data: allOrders = [] } = useOrdenes(tenant.id);
  const { data: cajaAbierta } = useCajaAbierta(tenant.id);

  const [montoPago, setMontoPago] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [conceptoPago, setConceptoPago] = useState<string>("Abono a cuenta");
  const [showPagoPanel, setShowPagoPanel] = useState<boolean>(false);
  const [procesandoPago, setProcesandoPago] = useState<boolean>(false);
  const [searchOrder, setSearchOrder] = useState<string>("");

  const empty = { 
    nombre: "", 
    apellido: "", 
    telefono: "", 
    email: "", 
    direccion: "", 
    sector: "",
    edificio_apto: "",
    referencia: "",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    cedula: "", 
    notas: "", 
    tipo: "Consumidor Final" as Cliente["tipo"], 
    limite_credito: 0 
  };
  const [f, setF] = useState(cliente ? { ...empty, ...cliente } : empty);
  const [hasDelivery, setHasDelivery] = useState(!!cliente?.direccion);
  const [loadingRNC, setLoadingRNC] = useState(false);

  const clientOrders = allOrders.filter(o => o.cliente_id === cliente?.id && o.estado !== "ANULADA");
  const filteredClientOrders = clientOrders.filter(o => {
    const q = searchOrder.toLowerCase().trim();
    if (!q) return true;
    const matchNumero = o.numero?.toLowerCase().includes(q);
    const dateStr = new Date(o.creado_en).toLocaleDateString("es-DO").toLowerCase();
    const matchDate = dateStr.includes(q);
    return matchNumero || matchDate;
  });
  const outstandingDebt = clientOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);

  async function handleSearchRNC() {
    const rnc = f.cedula?.replace(/\D/g, "");
    if (!rnc || rnc.length < 9) {
      toast.error("RNC/Cédula inválido (min. 9 dígitos)");
      return;
    }
    setLoadingRNC(true);
    try {
      const { data, error } = await supabase.functions.invoke('pronesoft-proxy', {
        body: {
          action: 'get-rnc',
          payload: { rnc }
        }
      });
      if (error || !data) throw new Error();
      if (data?.name) {
        setF(prev => ({ ...prev, nombre: data.name, cedula: data.rnc || rnc }));
        toast.success("Datos obtenidos ✅");
      } else {
        toast.error("No se encontró el contribuyente");
      }
    } catch (e) {
      toast.error("Error al conectar con el servicio DGII");
    } finally {
      setLoadingRNC(false);
    }
  }

  async function handleRegistrarPago() {
    const monto = Number(montoPago) || 0;
    if (monto <= 0) {
      toast.error("El monto de pago debe ser mayor a 0");
      return;
    }
    if (monto > outstandingDebt) {
      toast.error(`El monto no puede exceder la deuda de RD$ ${formatRD(outstandingDebt)}`);
      return;
    }
    if (!cajaAbierta) {
      toast.error("La caja debe estar abierta para poder registrar un pago.");
      return;
    }

    setProcesandoPago(true);
    try {
      const pendingOrders = clientOrders
        .filter(o => (o.saldo || 0) > 0)
        .sort((a, b) => +new Date(a.creado_en) - +new Date(b.creado_en));

      let remaining = monto;
      const updatedOrders: Orden[] = [];

      for (const order of pendingOrders) {
        if (remaining <= 0) break;
        const currentSaldo = order.saldo || 0;
        const currentPagado = order.pagado || 0;

        const p = Math.min(remaining, currentSaldo);
        const newPagado = +(currentPagado + p).toFixed(2);
        const newSaldo = +(currentSaldo - p).toFixed(2);

        const nextState = order.estado;

        updatedOrders.push({
          ...order,
          pagado: newPagado,
          saldo: newSaldo,
          estado: nextState
        });

        remaining = +(remaining - p).toFixed(2);
      }

      for (const updOrder of updatedOrders) {
        await saveOrden(updOrder);
      }

      const movId = uid("mov");
      await saveMovimiento({
        id: movId,
        tenant_id: tenant.id,
        caja_id: cajaAbierta.id,
        empleado_id: user?.empleado?.id || tenant.id,
        tipo: "ABONO",
        concepto: `${conceptoPago.trim()} - Cliente: ${f.nombre} ${f.apellido || ""}`,
        monto: monto,
        metodo: metodoPago,
        creado_en: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['ordenes', tenant.id] });
      queryClient.invalidateQueries({ queryKey: ['movimientos', tenant.id] });
      
      toast.success("¡Pago registrado y aplicado con éxito! 💵");
      setMontoPago("");
      setShowPagoPanel(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al registrar el pago: " + (err.message || JSON.stringify(err)));
    } finally {
      setProcesandoPago(false);
    }
  }

  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      const data = cliente ? { ...empty, ...cliente } : empty;
      setF(data);
      setHasDelivery(!!cliente?.direccion);
      setShowPagoPanel(false);
      setMontoPago("");
      setConceptoPago("Abono a cuenta");
      setMetodoPago("EFECTIVO");
      setSearchOrder("");
      setStep(1);
    }
  }, [cliente, open]);

  function handleNextStep() {
    const isEmpresa = f.tipo === "Empresa";
    const phoneDigits = f.telefono.replace(/\D/g, "");
    if (!f.nombre.trim() || (!isEmpresa && !f.apellido?.trim())) { 
      toast.error(isEmpresa ? "Nombre de empresa requerido" : "Nombre y apellido requeridos"); 
      return; 
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      toast.error("El teléfono debe tener al menos 10 dígitos");
      return;
    }
    setStep(2);
  }
 
  async function submit() {
    const isEmpresa = f.tipo === "Empresa";
    const phoneDigits = f.telefono.replace(/\D/g, "");
    if (!f.nombre.trim() || (!isEmpresa && !f.apellido?.trim())) { 
      toast.error(isEmpresa ? "Nombre de empresa requerido" : "Nombre y apellido requeridos"); 
      return; 
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      toast.error("El teléfono debe tener al menos 10 dígitos");
      return;
    }
    if (hasDelivery && !f.direccion?.trim()) {
      toast.error("La dirección es requerida para envío a domicilio");
      setStep(2);
      return;
    }
    try {
      const c: Cliente = {
        id: cliente?.id || uid("cli"), 
        tenant_id: tenant.id, 
        nombre: f.nombre, 
        apellido: f.apellido || undefined, 
        telefono: f.telefono,
        email: f.email || undefined, 
        direccion: hasDelivery ? f.direccion : undefined, 
        sector: hasDelivery ? f.sector : undefined,
        edificio_apto: hasDelivery ? f.edificio_apto : undefined,
        referencia: hasDelivery ? f.referencia : undefined,
        lat: hasDelivery ? f.lat : undefined,
        lng: hasDelivery ? f.lng : undefined,
        cedula: f.cedula || undefined,
        notas: f.notas || undefined, 
        tipo: f.tipo, 
        limite_credito: f.limite_credito,
        creado_en: cliente?.creado_en || new Date().toISOString(),
      };
      await saveCliente(c); 
      queryClient.invalidateQueries({ queryKey: ['clientes', tenant.id] });
      toast.success(cliente ? "Actualizado ✨" : "Cliente creado ✅"); 
      onDone(c);
    } catch (err: any) {
      toast.error("Error al guardar cliente");
    }
  }

  async function remove() {
    if (cliente) { 
      try {
        await deleteCliente(cliente.id); 
        queryClient.invalidateQueries({ queryKey: ['clientes', tenant.id] });
        toast.success("Eliminado 🗑️"); 
        onDone(); 
      } catch (err: any) {
        if (err?.code === '23503') {
          toast.error("No se puede eliminar: el cliente tiene órdenes registradas.");
        } else {
          toast.error(`Error al eliminar: ${err?.message || "Desconocido"}`);
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* STEPPER HEADER */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 sm:p-4 pb-2 relative border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-2 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 shadow-xs">
                {f.tipo === "Empresa" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-display font-bold text-foreground">
                  {cliente ? "Editar Perfil de Cliente" : "Nuevo Perfil de Cliente"}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {step === 1
                    ? "Paso 1: Información personal y contacto"
                    : "Paso 2: Dirección de entrega y preferencias"}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Buttons (Centered Pills) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-2 py-1 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 1
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 1
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                1
              </span>
              <span>Datos de Contacto</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className={`flex items-center justify-center gap-2 py-1 px-3 rounded-xl text-xs font-bold transition-all ${
                step === 2
                  ? "bg-primary text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === 2
                    ? "bg-white/25 text-white"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                2
              </span>
              <span>Entrega & Notas</span>
            </button>
          </div>
        </div>

        {/* DIALOG BODY */}
        <div className="px-4 sm:px-5 pt-2.5 pb-3.5">
          {step === 1 ? (
            /* STEP 1: DATOS DE CONTACTO */
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-3 duration-200">
              <div className="grid gap-2.5 grid-cols-2">
                {/* Tipo de cliente */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tipo de Cliente</Label>
                  <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
                    <SelectTrigger className="h-8.5 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="Consumidor Final">
                        <span className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-teal-600" />
                          <span>Consumidor Final</span>
                        </span>
                      </SelectItem>
                      {tenant.config?.ncf_facturacion_activa && (
                        <SelectItem value="Empresa">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-purple-600" />
                            <span>Empresa</span>
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Teléfono */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Teléfono / WhatsApp *</Label>
                  <Input 
                    value={f.telefono} 
                    onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} 
                    placeholder="809-000-0000" 
                    className="h-8.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Nombre / Apellido / Empresa / RNC */}
              {f.tipo === "Empresa" ? (
                <div className="grid gap-2.5 grid-cols-2 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nombre de la Empresa *</Label>
                    <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Inversiones Dominicana" className="h-8.5 rounded-xl text-xs" />
                  </div>
                  {tenant.config?.ncf_facturacion_activa ? (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">RNC de la Empresa</Label>
                      <div className="flex gap-1.5">
                        <Input 
                          value={f.cedula} 
                          onChange={(e) => setF({ ...f, cedula: e.target.value })} 
                          placeholder="131-12345-6"
                          className="h-8.5 rounded-xl text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8.5 rounded-xl px-2.5 text-xs gap-1 border-slate-300 dark:border-slate-800 text-primary hover:bg-primary/5 flex items-center font-semibold shrink-0"
                          onClick={handleSearchRNC}
                          disabled={loadingRNC}
                        >
                          {loadingRNC ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Search className="h-3.5 w-3.5" />
                          )}
                          <span>Buscar</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              ) : (
                <div className="grid gap-2.5 grid-cols-2 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nombre *</Label>
                    <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Juan" className="h-8.5 rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Apellido *</Label>
                    <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" className="h-8.5 rounded-xl text-xs" />
                  </div>
                </div>
              )}

              {/* Email & Línea de Crédito */}
              <div className="grid gap-2.5 grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Email (Opcional)</Label>
                  <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" className="h-8.5 rounded-xl text-xs" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Línea de Crédito</Label>
                    <Switch 
                      checked={f.limite_credito > 0} 
                      onCheckedChange={(checked) => setF({ ...f, limite_credito: checked ? 5000 : 0 })} 
                      className="scale-75 origin-right"
                    />
                  </div>
                  {f.limite_credito > 0 ? (
                    <div className="relative animate-in fade-in duration-150">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input 
                        type="number" 
                        value={f.limite_credito} 
                        onChange={(e) => setF({ ...f, limite_credito: Number(e.target.value) || 0 })} 
                        className="h-8.5 pl-8 rounded-xl font-bold text-xs"
                      />
                    </div>
                  ) : (
                    <div className="h-8.5 flex items-center px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11px] text-muted-foreground">
                      Sin crédito habilitado
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1 Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {cliente && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" className="bg-red-500 hover:bg-red-600 text-white border-none rounded-xl h-8 text-xs px-3 font-bold shadow-xs transition-colors">
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-none shadow-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar a {cliente.nombre}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el registro del cliente pero sus órdenes pasadas permanecerán en el sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl border-none hover:bg-destructive/90">Eliminar permanentemente</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" className="rounded-xl h-8 px-4 text-xs font-medium" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleNextStep} className="rounded-xl h-8 px-5 text-xs font-bold bg-primary text-white gap-1.5 shadow-md">
                    Siguiente: Entrega <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: DIRECCIÓN DE ENTREGA Y PREFERENCIAS */
            <div className="space-y-2 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Delivery Toggle Card */}
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-6.5 w-6.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Truck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Envío a Domicilio</span>
                    <span className="text-[10px] text-muted-foreground">¿Este cliente requiere delivery habitualmente?</span>
                  </div>
                </div>
                <Switch 
                  checked={hasDelivery} 
                  onCheckedChange={(checked) => {
                    setHasDelivery(checked);
                    if (!checked) setF({ ...f, direccion: "" });
                  }} 
                  className="scale-80 origin-right"
                />
              </div>

              {hasDelivery ? (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <AddressAutocomplete
                    value={{
                      direccion: f.direccion || "",
                      sector: f.sector || "",
                      edificio_apto: f.edificio_apto || "",
                      referencia: f.referencia || "",
                      lat: f.lat,
                      lng: f.lng,
                    }}
                    onChange={(addr) => {
                      setF({
                        ...f,
                        direccion: addr.direccion,
                        sector: addr.sector,
                        edificio_apto: addr.edificio_apto,
                        referencia: addr.referencia,
                        lat: addr.lat,
                        lng: addr.lng,
                      });
                    }}
                    label="Dirección de Entrega"
                    required
                    showDetails={false}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500">Edificio / Apto / Nivel</Label>
                      <div className="relative">
                        <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          value={f.edificio_apto || ""}
                          onChange={(e) => setF({ ...f, edificio_apto: e.target.value })}
                          placeholder="Torre / Apto 4B"
                          className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500">Sector / Barrio</Label>
                      <Input
                        value={f.sector || ""}
                        onChange={(e) => setF({ ...f, sector: e.target.value })}
                        placeholder="Ej. Piantini"
                        className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500">Punto de Referencia (Para el Repartidor)</Label>
                    <Input
                      value={f.referencia || ""}
                      onChange={(e) => setF({ ...f, referencia: e.target.value })}
                      placeholder="Ej. Portón negro frente al parque, timbre 4B..."
                      className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[11px] text-muted-foreground">El cliente no tiene dirección de envío configurada. Retirará en el local.</p>
                </div>
              )}

              {/* Notas */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Notas / Comentarios Internos</Label>
                <Textarea 
                  value={f.notas} 
                  onChange={(e) => setF({ ...f, notas: e.target.value })} 
                  placeholder="Preferencias de lavado, alergias, almidón, etc..." 
                  className="h-11 min-h-[38px] max-h-[50px] resize-none rounded-xl text-xs py-1.5 px-3"
                />
              </div>

              {/* Step 2 Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-8 px-4 text-xs font-medium gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="rounded-xl h-8 text-xs px-4 border-slate-300 dark:border-slate-800 font-medium" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={submit} className="bg-primary text-primary-foreground rounded-xl h-8 text-xs px-5 font-bold shadow-md hover:bg-primary/90 transition-colors gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Guardar Cliente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
