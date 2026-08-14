import { useState } from "react";
import { AlertCircle, Calendar, Clock, Loader2, AlertTriangle, MessageSquare, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Orden, type Cliente, type Tenant, saveOrden } from "@/lib/storage";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface IncidenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: Orden | null;
  cliente?: Cliente | null;
  tenant: Tenant;
  onSaved: (updatedOrder: Orden) => void;
}

const MOTIVOS_INCIDENCIA = [
  { id: "AUSENTE", label: "Cliente ausente / No está en el domicilio" },
  { id: "NO_RESPONDE", label: "Teléfono apagado / No contesta llamadas ni WhatsApp" },
  { id: "DIRECCION_ERRONEA", label: "Dirección incorrecta / No localizada" },
  { id: "CLIMA_TRAFICO", label: "Inconveniente vial / Lluvia intensa" },
  { id: "REPROGRAMADO", label: "Reprogramado a petición del cliente" },
  { id: "PROBLEMA_PAGO", label: "Problema con el cobro / Dinero incompleto" },
  { id: "OTRO", label: "Otro inconveniente" },
];

export function IncidenciaDialog({
  open,
  onOpenChange,
  orden,
  cliente,
  tenant,
  onSaved,
}: IncidenciaDialogProps) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState<string>("AUSENTE");
  const [notas, setNotas] = useState<string>("");
  const [reprogramarFecha, setReprogramarFecha] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!orden) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const motivoObj = MOTIVOS_INCIDENCIA.find((m) => m.id === motivo);
      const motivoLabel = motivoObj?.label || motivo;

      const updated: Orden = {
        ...orden,
        estado: "INCIDENCIA",
        incidencia_motivo: motivoLabel,
        incidencia_notas: notas.trim() || undefined,
        incidencia_fecha: new Date().toISOString(),
        ...(reprogramarFecha ? { fecha_entrega: reprogramarFecha } : {}),
      };

      await saveOrden(updated);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });

      toast.warning("Incidencia registrada ⚠️", {
        description: `La orden #${orden.numero} ha sido marcada con incidencia.`,
      });

      onSaved(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al registrar la incidencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolverIncidencia = async () => {
    setIsSubmitting(true);
    try {
      const updated: Orden = {
        ...orden,
        estado: "LISTA", // Vuelve a estar lista para nuevo intento de despacho
        incidencia_motivo: undefined,
        incidencia_notas: undefined,
      };

      await saveOrden(updated);
      queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] });

      toast.success("Incidencia resuelta ✅", {
        description: `La orden #${orden.numero} vuelve a estar pendiente de despacho.`,
      });

      onSaved(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al resolver la incidencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-md rounded-3xl sm:rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>Reportar Incidencia</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                  #{orden.numero}
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Cliente: {cliente?.nombre || "Sin nombre"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Motivo del Inconveniente <span className="text-rose-500">*</span>
            </Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MOTIVOS_INCIDENCIA.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs py-2">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Reprogramar Próxima Entrega (Opcional)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={reprogramarFecha}
                onChange={(e) => setReprogramarFecha(e.target.value)}
                className="h-10 pl-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Detalles / Comentario del Repartidor
            </Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Se llamó 3 veces al número y el portero indicó que no estaban..."
              className="h-20 text-xs rounded-xl resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col-reverse sm:flex-row gap-2 items-stretch sm:items-center sm:justify-between">
          {orden.estado === "INCIDENCIA" ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleResolverIncidencia}
              disabled={isSubmitting}
              className="rounded-xl h-10 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 w-full sm:w-auto"
            >
              <Undo2 className="mr-1.5 h-4 w-4" /> Reintentar Despacho
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-10 px-4 text-xs font-bold w-full sm:w-auto"
            >
              Cancelar
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl h-11 sm:h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 w-full sm:w-auto cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" /> Registrar Incidencia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
