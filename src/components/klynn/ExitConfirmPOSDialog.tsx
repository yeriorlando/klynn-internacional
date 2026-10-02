import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PauseCircle, ArrowLeft, Trash2 } from "lucide-react";

interface ExitConfirmPOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalPrendas: number;
  onPausarYSalir: () => void;
  onSeguirEditando: () => void;
  onDescartarYSalir: () => void;
}

export function ExitConfirmPOSDialog({
  open,
  onOpenChange,
  totalPrendas,
  onPausarYSalir,
  onSeguirEditando,
  onDescartarYSalir,
}: ExitConfirmPOSDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] sm:max-w-[500px] p-6 rounded-3xl border border-[#1B4B73]/25 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1B4B73]/10 text-[#1B4B73] dark:text-[#38bdf8] shadow-xs">
              <PauseCircle className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                ¿Deseas salir de la orden?
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Hay{" "}
                <span className="font-bold text-white bg-[#1B4B73] px-2 py-0.5 rounded-md text-xs shadow-2xs">
                  {totalPrendas} prenda(s)
                </span>{" "}
                en mostrador sin procesar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {/* Fila en 2 columnas: Col 1 Pausar y salir | Col 2 Seguir en la orden */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Columna 1: Pausar y Salir (Azul Añil) */}
            <Button
              type="button"
              className="w-full h-11 bg-[#1B4B73] hover:bg-[#153a5b] text-white rounded-xl font-bold text-xs sm:text-[12.5px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer border-none"
              onClick={onPausarYSalir}
            >
              <PauseCircle className="h-4 w-4 shrink-0" />
              <span>Pausar orden y salir</span>
            </Button>

            {/* Columna 2: Seguir en la orden (Fondo verde, texto blanco) */}
            <Button
              type="button"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-[12.5px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer border-none"
              onClick={onSeguirEditando}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Seguir en la orden</span>
            </Button>
          </div>

          {/* Botón inferior: Descartar orden y salir (Fondo rojo centrado, texto blanco) */}
          <Button
            type="button"
            className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-[12.5px] shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer border-none"
            onClick={onDescartarYSalir}
          >
            <Trash2 className="h-4 w-4 shrink-0 text-white" />
            <span>Descartar orden y salir</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
