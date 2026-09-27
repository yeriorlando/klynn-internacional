import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Unlock, Banknote, Check, Loader2 } from "lucide-react";
import {
  saveCaja,
  saveMovimiento,
  getCajaAbierta,
  uid,
  formatAmountInput,
  parseAmount,
  getActiveTenantLocalization,
} from "@/lib/storage";
import { toast } from "sonner";

export function MorningShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="morningSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
        <linearGradient id="morningSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="morningHills" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#morningSky)" />
      {/* Sun rays */}
      <path d="M24 8V5M13 14L10 11M35 14L38 11" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      {/* Rising Sun */}
      <circle cx="24" cy="27" r="11" fill="url(#morningSun)" />
      {/* Horizon wave / Landscape */}
      <path d="M4 33C11 31 17 34 24 32C31 30 37 33 44 31V44H4V33Z" fill="url(#morningHills)" opacity="0.9" />
      <path d="M4 37C11 36 18 38 25 36.5C32 35 38 37 44 36V44H4V37Z" fill="#9A3412" />
    </svg>
  );
}

export function AfternoonShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="afternoonSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0F9FF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id="afternoonSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#afternoonSky)" />
      {/* Radiant Glow */}
      <circle cx="24" cy="23" r="15" fill="#FEF3C7" opacity="0.7" />
      {/* Solar Rays */}
      <g stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
        <line x1="24" y1="5" x2="24" y2="8" />
        <line x1="24" y1="38" x2="24" y2="41" />
        <line x1="6" y1="23" x2="9" y2="23" />
        <line x1="39" y1="23" x2="42" y2="23" />
        <line x1="11" y1="10" x2="13.5" y2="12.5" />
        <line x1="34.5" y1="33.5" x2="37" y2="36" />
        <line x1="11" y1="36" x2="13.5" y2="33.5" />
        <line x1="34.5" y1="12.5" x2="37" y2="10" />
      </g>
      {/* Bright Sun */}
      <circle cx="24" cy="23" r="9.5" fill="url(#afternoonSun)" />
      {/* Crisp White Cloud */}
      <path d="M31 35C34 35 36.5 32.8 36.5 30C36.5 27.5 34.5 25.4 32 25.1C31.5 22 28.8 19.5 25.5 19.5C21.8 19.5 18.8 22.5 18.8 26.2C18.8 26.5 18.8 26.8 18.9 27.1C17.3 27.7 16.2 29.2 16.2 31C16.2 33.2 18.2 35 20.5 35H31Z" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}

export function NightShiftIcon({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
        <linearGradient id="moonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#nightSky)" />
      {/* Little Stars */}
      <circle cx="11" cy="13" r="1.4" fill="#FDE047" opacity="0.9" />
      <circle cx="37" cy="11" r="1.2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="35" cy="35" r="1.3" fill="#FDE047" opacity="0.8" />
      <circle cx="13" cy="37" r="1" fill="#FFFFFF" opacity="0.7" />
      <path d="M37 19L38 21L40 22L38 23L37 25L36 23L34 22L36 21L37 19Z" fill="#FDE047" opacity="0.85" />
      {/* Crescent Moon */}
      <path
        d="M26.5 12C20.1 12 15 17.1 15 23.5C15 29.9 20.1 35 26.5 35C29.4 35 32.1 33.9 34.2 32.1C30.2 31.6 27 28.2 27 24.1C27 20 30.2 16.6 34.2 16.1C32.1 14.3 29.4 13.2 26.5 12Z"
        fill="url(#moonGlow)"
      />
    </svg>
  );
}

export interface AperturaDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  empleadoId: string;
  onDone: () => Promise<void> | void;
}

export function AperturaDialog({
  open,
  onOpenChange,
  tenantId,
  empleadoId,
  onDone,
}: AperturaDialogProps) {
  const [montoStr, setMontoStr] = useState<string>("");
  const [turno, setTurno] = useState<"Mañana" | "Tarde" | "Noche">("Mañana");
  const [loading, setLoading] = useState(false);
  const currencySymbol = getActiveTenantLocalization().moneda_simbolo || "RD$";

  async function submit() {
    const monto = parseAmount(montoStr);
    if (monto <= 0) {
      toast.error("Por favor ingresa un monto inicial válido");
      return;
    }
    setLoading(true);
    try {
      // Validar si ya hay una caja abierta para evitar duplicados accidentales
      const yaAbierta = await getCajaAbierta(tenantId);
      if (yaAbierta) {
        toast.info("Ya existe una caja abierta para esta sucursal");
        await onDone();
        onOpenChange(false);
        setMontoStr("");
        return;
      }

      const cajaId = uid("caj");
      await saveCaja({
        id: cajaId,
        tenant_id: tenantId,
        empleado_id: empleadoId,
        monto_inicial: monto,
        estado: "ABIERTA",
        abierta_en: new Date().toISOString(),
        notas_apertura: `Turno: ${turno}`,
      });
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenantId,
        caja_id: cajaId,
        empleado_id: empleadoId,
        tipo: "INGRESO",
        concepto: "Apertura de caja",
        monto,
        creado_en: new Date().toISOString(),
      });
      toast.success("Caja abierta correctamente 🔓");
      await onDone();
      onOpenChange(false);
      setMontoStr("");
    } catch (err: any) {
      console.error("Error opening box:", err);
      toast.error("Error al abrir caja");
    } finally {
      setLoading(false);
    }
  }

  const TURNOS = [
    {
      id: "Mañana",
      label: "Mañana",
      IconComponent: MorningShiftIcon,
      activeRing: "border-orange-500 bg-orange-500/[0.04] ring-2 ring-orange-500/20 text-orange-950 shadow-xs",
    },
    {
      id: "Tarde",
      label: "Tarde",
      IconComponent: AfternoonShiftIcon,
      activeRing: "border-sky-500 bg-sky-500/[0.04] ring-2 ring-sky-500/20 text-sky-950 shadow-xs",
    },
    {
      id: "Noche",
      label: "Noche",
      IconComponent: NightShiftIcon,
      activeRing: "border-indigo-500 bg-indigo-500/[0.04] ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs",
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl p-5 shadow-2xl border-border/80">
        <DialogHeader className="flex flex-row items-center gap-2.5 space-y-0 pb-0.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-2xs">
            <Unlock className="h-4 w-4" />
          </div>
          <div>
            <DialogTitle className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Apertura de Caja
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              Establece el fondo inicial en efectivo para iniciar operaciones.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* HERO CARD MONTO INICIAL */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/70 dark:to-slate-900 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                Fondo de Efectivo Inicial
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 px-1.5 py-0.5 rounded-full">
                Para cambio y vuelto
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 py-1">
              <span className="font-display text-2xl font-bold text-slate-400 select-none">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={montoStr}
                onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                placeholder="0.00"
                disabled={loading}
                className="w-full max-w-[220px] bg-transparent text-center font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 tracking-tight"
              />
            </div>

            {/* Presets Rápidos con separación de miles */}
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-1 flex-wrap">
              {[
                { label: `${currencySymbol} 500`, val: "500" },
                { label: `${currencySymbol} 1,000`, val: "1,000" },
                { label: `${currencySymbol} 2,000`, val: "2,000" },
                { label: `${currencySymbol} 3,000`, val: "3,000" },
              ].map((p) => {
                const isSelected = parseAmount(montoStr) === parseAmount(p.val) && montoStr !== "";
                return (
                  <button
                    key={p.val}
                    type="button"
                    disabled={loading}
                    onClick={() => setMontoStr(p.val)}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-primary dark:text-white dark:border-primary shadow-2xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECCIONA EL TURNO */}
          <div className="space-y-1.5">
            <Label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selecciona el Turno Operativo
            </Label>

            <div className="grid grid-cols-3 gap-2.5">
              {TURNOS.map((t) => {
                const Icon = t.IconComponent;
                const sel = turno === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={loading}
                    onClick={() => setTurno(t.id as any)}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border py-3 px-2 text-center transition-all duration-200 ${
                      sel
                        ? t.activeRing
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50/80 dark:hover:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200 shadow-2xs"
                    } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Icon className="mb-1.5 h-11 w-11 shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105" />
                    <div className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                      {t.label}
                    </div>
                    {sel && (
                      <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 dark:bg-primary text-white shadow-2xs">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-2.5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 rounded-xl font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Abriendo...</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Abrir Caja</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
