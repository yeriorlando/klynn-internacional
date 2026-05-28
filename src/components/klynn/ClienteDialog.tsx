import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Phone, Mail, MapPin, Trash2, Search, Loader2, CreditCard, Coins, Check, AlertTriangle, FileText } from "lucide-react";
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

  const empty = { 
    nombre: "", 
    apellido: "", 
    telefono: "", 
    email: "", 
    direccion: "", 
    cedula: "", 
    notas: "", 
    tipo: "Consumidor Final" as Cliente["tipo"], 
    limite_credito: 0 
  };
  const [f, setF] = useState(cliente ? { ...empty, ...cliente } : empty);
  const [hasDelivery, setHasDelivery] = useState(!!cliente?.direccion);
  const [loadingRNC, setLoadingRNC] = useState(false);

  const clientOrders = allOrders.filter(o => o.cliente_id === cliente?.id && o.estado !== "ANULADA");
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

        const nextState = newSaldo === 0 ? "PAGADA" : order.estado;

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

  useEffect(() => {
    if (open) {
      const data = cliente ? { ...empty, ...cliente } : empty;
      setF(data);
      setHasDelivery(!!cliente?.direccion);
      setShowPagoPanel(false);
      setMontoPago("");
      setConceptoPago("Abono a cuenta");
      setMetodoPago("EFECTIVO");
    }
  }, [cliente, open]);
 
  async function submit() {
    const isEmpresa = f.tipo === "Empresa";
    const phoneDigits = f.telefono.replace(/\D/g, "");
    if (!f.nombre.trim() || (!isEmpresa && !f.apellido.trim())) { 
      toast.error(isEmpresa ? "Nombre de empresa requerido" : "Nombre y apellido requeridos"); 
      return; 
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      toast.error("El teléfono debe tener al menos 10 dígitos");
      return;
    }
    if (hasDelivery && !f.direccion?.trim()) {
      toast.error("La dirección es requerida para envío a domicilio");
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background flex flex-col md:flex-row h-[95vh] md:h-[530px]">
        {/* LEFT COLUMN: Profile Form */}
        <div className="flex-1 flex flex-col p-5 md:p-6 overflow-hidden h-full justify-between">
          {/* Header - Static */}
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-display font-black text-foreground">
              {cliente ? "Editar Perfil de Cliente" : "Nuevo Perfil de Cliente"}
            </DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
              Introduce la información de contacto y detalles de facturación del cliente.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Form Fields */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin my-1.5">
            <div className="grid gap-2.5 grid-cols-2">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo de Cliente</Label>
                <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
                  <SelectTrigger className="h-9 rounded-xl mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="Consumidor Final">👤 Consumidor Final</SelectItem>
                    {tenant.config?.ncf_facturacion_activa && <SelectItem value="Empresa">🏢 Empresa</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teléfono / WhatsApp (Opcional)</Label>
                <Input 
                  value={f.telefono} 
                  onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} 
                  placeholder="809-000-0000" 
                  className="h-9 rounded-xl mt-1 text-xs"
                />
              </div>
            </div>

            {f.tipo === "Empresa" ? (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-left-1 duration-150">
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre de la Empresa</Label>
                  <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Inversiones Dominicana" className="h-9 rounded-xl mt-1 text-xs" />
                </div>
                <div className="grid gap-2.5 grid-cols-2">
                  {tenant.config?.ncf_facturacion_activa && (
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">RNC de la Empresa</Label>
                      <div className="relative mt-1">
                        <Input 
                          value={f.cedula} 
                          onChange={(e) => setF({ ...f, cedula: e.target.value })} 
                          placeholder="131-12345-6"
                          className="h-9 rounded-xl pr-9 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7.5 w-7.5 text-primary hover:bg-primary/10 rounded-lg"
                          onClick={handleSearchRNC}
                          disabled={loadingRNC}
                        >
                          {loadingRNC ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className={tenant.config?.ncf_facturacion_activa ? "" : "col-span-2"}>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email (Opcional)</Label>
                    <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="empresa@correo.com" className="h-9 rounded-xl mt-1 text-xs" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-left-1 duration-150">
                <div className="grid gap-2.5 grid-cols-2">
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre</Label>
                    <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Juan" className="h-9 rounded-xl mt-1 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Apellido</Label>
                    <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" className="h-9 rounded-xl mt-1 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email (Opcional)</Label>
                  <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" className="h-9 rounded-xl mt-1 text-xs" />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between rounded-xl border border-border py-2 px-3 bg-accent/30 dark:bg-accent/10 mt-1">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Envío a domicilio</Label>
                <div className="text-[9px] text-muted-foreground">¿Este cliente requiere servicio de delivery constante?</div>
              </div>
              <Switch 
                checked={hasDelivery} 
                onCheckedChange={(checked) => {
                  setHasDelivery(checked);
                  if (!checked) setF({ ...f, direccion: "" });
                }} 
              />
            </div>

            {hasDelivery && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dirección de entrega</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} placeholder="Calle, # Casa, Sector, Referencia..." className="h-9 pl-8 rounded-xl text-xs" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notas / Comentarios Internos</Label>
              <Textarea 
                value={f.notas} 
                onChange={(e) => setF({ ...f, notas: e.target.value })} 
                placeholder="Indica preferencias de lavado, alergias, o detalles importantes..." 
                className="mt-1 h-12 min-h-[48px] max-h-[70px] resize-none rounded-xl text-xs py-2 px-3"
              />
            </div>
          </div>

          {/* Footer - Static and ALWAYS visible at first glance */}
          <div className="border-t border-border pt-3 mt-1.5 flex items-center justify-between">
            {cliente && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl h-9 text-xs"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
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
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" className="rounded-xl h-9 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="button" onClick={submit} className="bg-gradient-primary text-white rounded-xl h-9 text-xs px-6 shadow-sm hover:opacity-95">Guardar Cliente</Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Financial & Credit Panel */}
        <div className="w-full md:w-[350px] bg-accent/20 dark:bg-accent/5 p-5 md:p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border h-full overflow-hidden">
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Header - Static */}
            <div className="border-b border-border/80 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-500" /> Crédito y Finanzas
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Gestiona la línea de crédito y el registro de cobros.
              </p>
            </div>

            {/* Scrollable Credit Status / Payment Panel */}
            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 scrollbar-thin my-1">
              <div className="flex items-center justify-between rounded-xl border border-border py-2 px-3 bg-background">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">Línea de Crédito</Label>
                  <div className="text-[9px] text-muted-foreground">Permitir compras al crédito.</div>
                </div>
                <Switch 
                  checked={f.limite_credito > 0} 
                  onCheckedChange={(checked) => setF({ ...f, limite_credito: checked ? 5000 : 0 })} 
                />
              </div>

              {f.limite_credito > 0 && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Límite de crédito (RD$)</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <Input 
                      type="number" 
                      value={f.limite_credito} 
                      onChange={(e) => setF({ ...f, limite_credito: Number(e.target.value) || 0 })} 
                      className="h-9 pl-8 rounded-xl font-bold text-xs"
                    />
                  </div>
                </div>
              )}

              {cliente && outstandingDebt > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/10 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[9px] uppercase font-black tracking-widest text-amber-600 dark:text-amber-500">Deuda Pendiente</h4>
                      <p className="text-lg font-display font-black text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatRD(outstandingDebt)}
                      </p>
                    </div>
                    {!showPagoPanel ? (
                      <Button 
                        type="button" 
                        onClick={() => {
                          setShowPagoPanel(true);
                          setMontoPago(String(outstandingDebt));
                        }} 
                        className="bg-amber-600 hover:bg-amber-700 text-white border-none font-bold rounded-xl text-[9px] h-7 px-2.5 shadow-sm"
                      >
                        Registrar pago
                      </Button>
                    ) : (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setShowPagoPanel(false)}
                        className="text-muted-foreground text-[10px] font-bold h-7 px-2"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>

                  {showPagoPanel && (
                    <div className="pt-2.5 border-t border-amber-200/50 dark:border-amber-900/20 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div>
                        <Label className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Monto a pagar (RD$)</Label>
                        <Input
                          type="number"
                          min="0.01"
                          max={outstandingDebt}
                          step="0.01"
                          value={montoPago}
                          onChange={(e) => setMontoPago(e.target.value)}
                          className="bg-white border-amber-200 focus-visible:ring-amber-500 text-amber-800 font-bold h-8.5 mt-1 rounded-lg text-xs"
                          placeholder="0.00"
                          disabled={procesandoPago}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <Label className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Método de Pago</Label>
                          <Select 
                            value={metodoPago} 
                            onValueChange={(v) => setMetodoPago(v as MetodoPago)}
                            disabled={procesandoPago}
                          >
                            <SelectTrigger className="bg-white border-amber-200 h-7.5 text-[10px] rounded-lg mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent position="popper" side="bottom" align="start" className="w-[var(--radix-select-trigger-width)]">
                              <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                              <SelectItem value="TARJETA">💳 Tarjeta</SelectItem>
                              <SelectItem value="TRANSFERENCIA">🏦 Transf.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Concepto</Label>
                          <Input
                            value={conceptoPago}
                            onChange={(e) => setConceptoPago(e.target.value)}
                            className="bg-white border-amber-200 text-amber-800 h-7.5 text-[10px] rounded-lg mt-1"
                            placeholder="Abono..."
                            disabled={procesandoPago}
                          />
                        </div>
                      </div>

                      {!cajaAbierta && (
                        <p className="text-[8px] text-destructive font-bold">
                          ⚠️ Caja cerrada. Abre caja.
                        </p>
                      )}

                      <Button
                        type="button"
                        onClick={handleRegistrarPago}
                        disabled={procesandoPago || !cajaAbierta || !montoPago || Number(montoPago) <= 0}
                        className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl mt-1 h-8.5 border-none shadow-sm text-xs"
                      >
                        {procesandoPago ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Cobrando...
                          </>
                        ) : (
                          "Confirmar Pago"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl bg-background/50 h-32 animate-in fade-in duration-200">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mb-1.5">
                    <Check className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Sin deudas</h4>
                  <p className="text-[8px] text-muted-foreground mt-0.5 max-w-[180px]">
                    El cliente está al día con sus pagos o no cuenta con crédito habilitado.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Static */}
          <div className="text-[8px] text-muted-foreground text-center border-t border-border/60 pt-2 mt-1.5">
            Sistema Klynn v1.1 • FIFO & Crédito
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
