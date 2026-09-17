import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/klynn/PriceInput";
import { Label } from "@/components/ui/label";
import {
  calcularTarifaHoraExtra,
  formatRD,
  type DetalleNomina,
  type FrecuenciaNomina,
} from "@/lib/storage";

interface ModalCalculadoraHorasExtrasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detalle: DetalleNomina | null;
  frecuenciaPeriodo?: FrecuenciaNomina;
  onSave: (
    detalle: DetalleNomina,
    montoPesos: number,
    cantidadHoras: number
  ) => Promise<void>;
}

export function ModalCalculadoraHorasExtras({
  open,
  onOpenChange,
  detalle,
  frecuenciaPeriodo = "QUINCENAL",
  onSave,
}: ModalCalculadoraHorasExtrasProps) {
  const [horas, setHoras] = useState<number>(0);
  const [minutos, setMinutos] = useState<number>(0);
  const [montoManual, setMontoManual] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Calcular sueldo mensual de base del colaborador
  const emp = detalle?.empleado;
  const divisor =
    frecuenciaPeriodo === "QUINCENAL" ? 2 : frecuenciaPeriodo === "SEMANAL" ? 4 : 1;

  const sueldoMensual = useMemo(() => {
    if (!detalle) return 0;
    if (emp?.salario_base && emp.salario_base > 0) return emp.salario_base;
    return (detalle.salario_base_periodo || 0) * divisor;
  }, [emp?.salario_base, detalle?.salario_base_periodo, divisor]);

  // Tarifas legales dominicanas (Ley 16-92, Art. 203)
  const tarifas = useMemo(() => {
    return calcularTarifaHoraExtra(sueldoMensual);
  }, [sueldoMensual]);

  // Total de horas en formato decimal
  const totalHorasDecimal = useMemo(() => {
    const h = Math.max(0, Number(horas) || 0);
    const m = Math.max(0, Math.min(59, Number(minutos) || 0));
    return +(h + m / 60).toFixed(2);
  }, [horas, minutos]);

  // Al abrir el modal, inicializar valores
  useEffect(() => {
    if (open && detalle) {
      const existingHours = detalle.cantidad_horas_extras || 0;
      if (existingHours > 0) {
        const h = Math.floor(existingHours);
        const m = Math.round((existingHours - h) * 60);
        setHoras(h);
        setMinutos(m);
      } else if (detalle.horas_extras > 0 && tarifas.horaExtra35 > 0) {
        const estimatedHours = +(detalle.horas_extras / tarifas.horaExtra35).toFixed(2);
        const h = Math.floor(estimatedHours);
        const m = Math.round((estimatedHours - h) * 60);
        setHoras(h);
        setMinutos(m);
      } else {
        setHoras(0);
        setMinutos(0);
      }

      setMontoManual(detalle.horas_extras || 0);
    }
  }, [open, detalle, tarifas.horaExtra35]);

  const handleHorasChange = (newHoras: number) => {
    const safeH = Math.max(0, newHoras);
    setHoras(safeH);
    const decimal = +(safeH + minutos / 60).toFixed(2);
    setMontoManual(+(decimal * tarifas.horaExtra35).toFixed(2));
  };

  const handleMinutosChange = (newMinutos: number) => {
    const safeM = Math.max(0, Math.min(59, newMinutos));
    setMinutos(safeM);
    const decimal = +(horas + safeM / 60).toFixed(2);
    setMontoManual(+(decimal * tarifas.horaExtra35).toFixed(2));
  };

  const handleQuickAddHoras = (increment: number) => {
    handleHorasChange(horas + increment);
  };

  const handleQuickAddMinutos = (increment: number) => {
    const totalM = minutos + increment;
    if (totalM >= 60) {
      const addedH = Math.floor(totalM / 60);
      const remM = totalM % 60;
      setHoras(horas + addedH);
      setMinutos(remM);
      const decimal = +(horas + addedH + remM / 60).toFixed(2);
      setMontoManual(+(decimal * tarifas.horaExtra35).toFixed(2));
    } else {
      handleMinutosChange(totalM);
    }
  };

  const handleReset = () => {
    setHoras(0);
    setMinutos(0);
    setMontoManual(0);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle) return;

    try {
      setSaving(true);
      await onSave(detalle, montoManual, totalHorasDecimal);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const nombreEmpleado = emp
    ? `${emp.nombre} ${emp.apellido || ""}`.trim()
    : "Empleado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[490px] bg-background text-foreground rounded-2xl p-5 sm:p-6 border-none shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                Horas Extras — {nombreEmpleado}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-[13px] text-muted-foreground truncate">
                {emp?.rol || "Colaborador"} • Tarifa:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  {formatRD(tarifas.horaExtra35)}/h
                </strong>{" "}
                (+35% Ley 16-92)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-3.5 pt-1">
          {/* TIRA DE TARIFAS */}
          <div className="flex items-center justify-between text-xs sm:text-[13px] px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span>
              Sueldo: <strong className="tabular-nums font-bold">{formatRD(sueldoMensual)}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Ordinaria: <strong className="tabular-nums font-bold">{formatRD(tarifas.horaOrdinaria)}/h</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">
              +35%: {formatRD(tarifas.horaExtra35)}/h
            </span>
          </div>

          {/* CAJA DE TIEMPO (HORAS Y MINUTOS) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Horas
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                    value={horas === 0 ? "" : horas}
                    placeholder="0"
                    onChange={(e) => handleHorasChange(Number(e.target.value) || 0)}
                    className="h-9.5 sm:h-10 text-center font-bold tabular-nums text-base bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-2xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Minutos
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={minutos === 0 ? "" : minutos}
                    placeholder="0"
                    onChange={(e) => handleMinutosChange(Number(e.target.value) || 0)}
                    className="h-9.5 sm:h-10 text-center font-bold tabular-nums text-base bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-2xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>

            {/* BOTONES RÁPIDOS */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickAddHoras(1)}
                  className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                >
                  +1h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddHoras(2)}
                  className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                >
                  +2h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddHoras(4)}
                  className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                >
                  +4h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddMinutos(30)}
                  className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                >
                  +30m
                </button>
              </div>

              {totalHorasDecimal > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-rose-600 cursor-pointer flex items-center gap-1 transition-colors"
                  title="Reiniciar a 0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>0</span>
                </button>
              )}
            </div>
          </div>

          {/* MONTO A PAGAR */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Monto Horas Extras
              </div>
              <div className="text-xs sm:text-[13px] text-muted-foreground tabular-nums">
                {totalHorasDecimal}h × {formatRD(tarifas.horaExtra35)}/h
              </div>
            </div>

            <div className="w-32 sm:w-36 shrink-0">
              <PriceInput
                value={montoManual}
                onChange={(val) => setMontoManual(val)}
                className="h-10 text-right font-bold tabular-nums text-base bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg shadow-2xs focus-visible:border-[#1B4B73] focus-visible:ring-[#1B4B73]/20"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* FOOTER ACCIONES */}
          <DialogFooter className="gap-2.5 pt-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="gap-2 bg-[#1B4B73] hover:bg-[#133857] text-white font-bold cursor-pointer shadow-xs hover:shadow h-10 px-5 text-xs sm:text-sm rounded-xl"
            >
              <Check className="h-4 w-4 text-[#F0B900]" />
              <span>Aplicar {formatRD(montoManual)}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
