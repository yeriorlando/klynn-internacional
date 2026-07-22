import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Phone, Mail, MapPin, Trash2, Search, Loader2, CreditCard, Coins, Check, AlertTriangle, FileText, Building2, User } from "lucide-react";
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
  const [searchOrder, setSearchOrder] = useState<string>("");

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
      <DialogContent className="max-w-[520px] p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl bg-background flex flex-col gap-0 [&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary/90 [&>button]:hover:scale-105 [&>button]:transition-all [&>button]:h-8 [&>button]:w-8 [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:rounded-full [&>button]:border-none [&>button]:shadow-xs">
        {/* Header */}
        <DialogHeader className="p-4 pb-2.5 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-extrabold text-xs shrink-0 shadow-xs">
              KL
            </div>
            <div className="text-left">
              <DialogTitle className="text-sm font-extrabold text-foreground">
                {cliente ? "Editar Perfil de Cliente" : "Nuevo Perfil de Cliente"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                Introduce la información de contacto y detalles del cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-4 space-y-2.5">
          <div className="grid gap-3 grid-cols-2">
            {/* Tipo de cliente */}
            <div>
              <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Tipo de Cliente</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
                <SelectTrigger className="h-9 rounded-xl mt-1 text-xs"><SelectValue /></SelectTrigger>
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
            {/* Telefono */}
            <div>
              <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Teléfono / WhatsApp</Label>
              <Input 
                value={f.telefono} 
                onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} 
                placeholder="809-000-0000" 
                className="h-9 rounded-xl mt-1 text-xs"
              />
            </div>
          </div>

          {/* Nombre / Apellido / Empresa / RNC (Siempre 2 Columnas) */}
          {f.tipo === "Empresa" ? (
            <div className="grid gap-3 grid-cols-2 animate-in fade-in duration-150">
              <div>
                <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Nombre de la Empresa</Label>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Inversiones Dominicana" className="h-9 rounded-xl mt-1 text-xs" />
              </div>
              {tenant.config?.ncf_facturacion_activa ? (
                <div>
                  <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">RNC de la Empresa</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input 
                      value={f.cedula} 
                      onChange={(e) => setF({ ...f, cedula: e.target.value })} 
                      placeholder="131-12345-6"
                      className="h-9 rounded-xl text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl px-2.5 text-xs gap-1 border-slate-300 dark:border-slate-800 text-primary hover:bg-primary/5 flex items-center font-semibold"
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
            <div className="grid gap-3 grid-cols-2 animate-in fade-in duration-150">
              <div>
                <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Nombre</Label>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Juan" className="h-9 rounded-xl mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Apellido</Label>
                <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" className="h-9 rounded-xl mt-1 text-xs" />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Email (Opcional)</Label>
            <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" className="h-9 rounded-xl mt-1 text-xs" />
          </div>

          {/* Switches (Envío a domicilio & Línea de Crédito) */}
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            {/* Envío a domicilio */}
            <div className="flex items-center gap-2.5 py-0.5 px-0.5">
              <Switch 
                checked={hasDelivery} 
                onCheckedChange={(checked) => {
                  setHasDelivery(checked);
                  if (!checked) setF({ ...f, direccion: "" });
                }} 
                className="scale-90 origin-left"
              />
              <div className="flex flex-col text-left">
                <Label className="text-xs font-extrabold text-foreground">Envío a domicilio</Label>
                <span className="text-[10px] text-muted-foreground">¿Requiere delivery?</span>
              </div>
            </div>

            {/* Línea de crédito */}
            <div className="flex items-center gap-2.5 py-0.5 px-0.5">
              <Switch 
                checked={f.limite_credito > 0} 
                onCheckedChange={(checked) => setF({ ...f, limite_credito: checked ? 5000 : 0 })} 
                className="scale-90 origin-left"
              />
              <div className="flex flex-col text-left">
                <Label className="text-xs font-extrabold text-foreground">Línea de Crédito</Label>
                <span className="text-[10px] text-muted-foreground">Permitir a crédito</span>
              </div>
            </div>
          </div>

          {/* Conditional Inputs Grid */}
          {(hasDelivery || f.limite_credito > 0) && (
            <div className="grid gap-3 grid-cols-2 pt-0.5 animate-in fade-in duration-150">
              {hasDelivery && (
                <div className={f.limite_credito > 0 ? "col-span-1" : "col-span-2"}>
                  <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Dirección de entrega</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} placeholder="Calle, # Casa, Sector..." className="h-9 pl-8 rounded-xl text-xs" />
                  </div>
                </div>
              )}
              {f.limite_credito > 0 && (
                <div className={hasDelivery ? "col-span-1" : "col-span-2"}>
                  <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Límite de crédito (RD$)</Label>
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
            </div>
          )}

          {/* Notas */}
          <div>
            <Label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Notas / Comentarios Internos</Label>
            <Textarea 
              value={f.notas} 
              onChange={(e) => setF({ ...f, notas: e.target.value })} 
              placeholder="Preferencias de lavado, alergias, etc..." 
              className="mt-1 h-12 min-h-[44px] max-h-[60px] resize-none rounded-xl text-xs py-1.5 px-3"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-3.5 px-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          {cliente && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" className="bg-red-500 hover:bg-red-600 text-white border border-red-600 hover:border-red-700 rounded-xl h-8.5 text-xs px-3.5 font-extrabold shadow-xs transition-colors"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
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
            <Button type="button" variant="outline" className="rounded-xl h-8.5 text-xs px-4 border-slate-300 dark:border-slate-800 font-extrabold" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={submit} className="bg-primary text-primary-foreground rounded-xl h-8.5 text-xs px-5 font-black shadow-xs hover:bg-primary/90 transition-colors">Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
