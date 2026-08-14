import { useState, useEffect } from "react";
import { 
  CheckCircle2, User, 
  CreditCard, DollarSign, Package, AlertCircle, Loader2, Sparkles, Building
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DigitalSignatureCanvas } from "./DigitalSignatureCanvas";
import { 
  type Orden, type Cliente, type Tenant, type MetodoPago, 
  saveOrden, saveMovimiento, formatRD, uid, crearNotificacion 
} from "@/lib/storage";
import { toast } from "sonner";
import { useCajaAbierta } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";

interface ProofOfDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: Orden | null;
  cliente?: Cliente | null;
  tenant: Tenant;
  onDelivered: (updatedOrder: Orden) => void;
}

export function ProofOfDeliveryDialog({
  open,
  onOpenChange,
  orden,
  cliente,
  tenant,
  onDelivered,
}: ProofOfDeliveryDialogProps) {
  const queryClient = useQueryClient();
  const { data: cajaAbierta } = useCajaAbierta(tenant.id);

  const [receptorTipo, setReceptorTipo] = useState<string>("Titular");
  const [receptorNombre, setReceptorNombre] = useState<string>(cliente?.nombre || "");
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-inicializar valores limpios cuando se abre el modal
  useEffect(() => {
    if (open) {
      setReceptorTipo("Titular");
      setReceptorNombre(cliente?.nombre || "");
      setFirmaUrl(null);
      setCobrarSaldo(true);
      setMontoCobro(orden?.saldo ? String(orden.saldo) : "0");
      setMetodoCobro("EFECTIVO");
    }
  }, [open, cliente?.id, orden?.id]);

  // Cobro contra entrega
  const [cobrarSaldo, setCobrarSaldo] = useState<boolean>(true);
  const [montoCobro, setMontoCobro] = useState<string>(orden?.saldo ? String(orden.saldo) : "0");
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>("EFECTIVO");

  const totalPrendas = orden?.items?.reduce((acc, it) => acc + it.cantidad, 0) || 0;
  const saldoPendiente = orden?.saldo || 0;

  const handleConfirmDelivery = async () => {
    if (!orden) return;
    if (!receptorNombre.trim()) {
      toast.error("Por favor indica el nombre de quien recibe la ropa");
      return;
    }

    setIsSubmitting(true);
    try {
      let nextSaldo = orden.saldo;
      let nextPagado = orden.pagado;

      // Procesar cobro si hay saldo pendiente
      const montoACobrar = Number(montoCobro) || 0;
      if (saldoPendiente > 0 && cobrarSaldo && montoACobrar > 0) {
        if (montoACobrar > saldoPendiente) {
          toast.error(`El monto no puede superar el saldo pendiente (${formatRD(saldoPendiente)})`);
          setIsSubmitting(false);
          return;
        }

        nextPagado = +(nextPagado + montoACobrar).toFixed(2);
        nextSaldo = +(saldoPendiente - montoACobrar).toFixed(2);

        // Si la caja está abierta, registrar el movimiento de ingreso
        if (cajaAbierta) {
          const movId = uid("mov");
          await saveMovimiento({
            id: movId,
            tenant_id: tenant.id,
            caja_id: cajaAbierta.id,
            empleado_id: orden.empleado_id || tenant.id,
            tipo: "INGRESO",
            concepto: `Cobro contra entrega - Orden #${orden.numero} (${cliente?.nombre || "Cliente"})`,
            monto: montoACobrar,
            metodo: metodoCobro,
            creado_en: new Date().toISOString(),
          });
        }
      }

      const nombreLimpio = receptorNombre.trim() || cliente?.nombre || "Titular";
      const receptorGuardado = receptorTipo === "Titular"
        ? `Titular: ${nombreLimpio}`
        : `${receptorTipo}: ${nombreLimpio}`;

      const updated: Orden = {
        ...orden,
        estado: "ENTREGADA",
        pagado: nextPagado,
        saldo: nextSaldo,
        pod_firma: firmaUrl || undefined,
        pod_receptor: receptorGuardado,
        pod_fecha: new Date().toISOString(),
        pod_cobro_monto: (montoACobrar > 0 && cobrarSaldo) ? montoACobrar : undefined,
        pod_cobro_metodo: (montoACobrar > 0 && cobrarSaldo) ? metodoCobro : undefined,
      };

      await saveOrden(updated);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["movimientos", tenant.id] });

      // Notificar a Cajera, Supervisor y Dueño en el sistema en tiempo real
      const cleanNum = (orden.numero || "").replace(/^#/, "");
      const receptorTxt = receptorTipo === "Titular"
        ? " (Titular)"
        : ` • Recibió: **${receptorTipo}: ${nombreLimpio}**`;

      const cobroTxt = (montoACobrar > 0 && cobrarSaldo) 
        ? ` • Cobrado: **${formatRD(montoACobrar)}** (${metodoCobro})`
        : saldoPendiente > 0 
          ? ` • Saldo pendiente: **${formatRD(saldoPendiente)}**` 
          : " • Pagado";

      try {
        await crearNotificacion({
          tenant_id: tenant.id,
          titulo: `Orden #${cleanNum} Entregada`,
          mensaje: `Cliente: **${cliente?.nombre || "Cliente"}**${receptorTxt}${cobroTxt}`,
          tipo: "SUCCESS",
          leida: false,
          link: `/t/${tenant.slug}/logistica`,
        });
      } catch (notifErr) {
        console.warn("Error creando notificación de entrega:", notifErr);
      }

      // Notificar por WhatsApp si está configurado
      if (cliente && tenant) {
        try {
          const { notificarWhatsApp } = await import("@/lib/whatsapp");
          await notificarWhatsApp(tenant, cliente, updated, "entregada");
        } catch (waErr) {
          console.warn("WhatsApp notification skipped/failed", waErr);
        }
      }

      toast.success("¡Entrega confirmada con éxito! ✅", {
        description: `Orden #${orden.numero} marcada como entregada.`,
      });

      onDelivered(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al confirmar la entrega: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orden) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-lg rounded-3xl sm:rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>Comprobante de Entrega</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  #{orden.numero}
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {cliente?.nombre || "Cliente"} · {totalPrendas} prenda{totalPrendas !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 space-y-4 overflow-y-auto flex-1">
          {/* Items Summary Badge */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" /> Detalle de Prendas
              </span>
              <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20">
                {totalPrendas} Totales
              </Badge>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {orden.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate pr-2">{it.descripcion}</span>
                  <span className="font-bold shrink-0">x{it.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Receiver Info */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              ¿Quién recibe la ropa? <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Select 
                value={receptorTipo} 
                onValueChange={(tipo) => {
                  setReceptorTipo(tipo);
                  if (tipo === "Titular") {
                    setReceptorNombre(cliente?.nombre || "");
                  } else {
                    setReceptorNombre("");
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs col-span-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Titular">Titular</SelectItem>
                  <SelectItem value="Conserje">Conserje</SelectItem>
                  <SelectItem value="Familiar">Familiar</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={receptorNombre}
                onChange={(e) => setReceptorNombre(e.target.value)}
                placeholder={
                  receptorTipo === "Titular"
                    ? "Nombre del titular..."
                    : receptorTipo === "Conserje"
                      ? "Nombre del conserje..."
                      : receptorTipo === "Familiar"
                        ? "Nombre del familiar..."
                        : receptorTipo === "Personal"
                          ? "Nombre del personal..."
                          : "Nombre de quien recibe..."
                }
                className="h-10 text-xs rounded-xl col-span-2"
                autoFocus={receptorTipo !== "Titular"}
              />
            </div>
          </div>

          {/* Pending Balance / Cash on Delivery */}
          {saldoPendiente > 0 && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" /> Cobro en Ruta
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Saldo restante: <strong className="text-sm font-black">{formatRD(saldoPendiente)}</strong>
                  </p>
                </div>
                <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                  Por Cobrar
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <Label className="text-[10px] font-bold text-amber-900 dark:text-amber-200">Monto a Cobrar (RD$)</Label>
                  <Input
                    type="number"
                    value={montoCobro}
                    onChange={(e) => setMontoCobro(e.target.value)}
                    className="h-9 mt-1 text-xs rounded-xl bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-amber-900 dark:text-amber-200">Método de Cobro</Label>
                  <Select value={metodoCobro} onValueChange={(v) => setMetodoCobro(v as MetodoPago)}>
                    <SelectTrigger className="h-9 mt-1 rounded-xl text-xs bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Digital Signature */}
          <DigitalSignatureCanvas onSignatureChange={setFirmaUrl} />
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col-reverse sm:flex-row gap-2 items-stretch sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl h-10 px-4 text-xs font-bold border-slate-200 dark:border-slate-800 w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmDelivery}
            disabled={isSubmitting}
            className="rounded-xl h-11 sm:h-10 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95 w-full sm:w-auto cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Entrega Final
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
