"use client";

import * as React from "react";
import { Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  value: string; // "HH:mm" (24-hour format, e.g. "16:00")
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const DIAL_RADIUS = 50;
const DIAL_CENTER = 70;

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Seleccionar hora",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"hours" | "minutes">("hours");

  // Parse inicial 24h a 12h
  const parsed = React.useMemo(() => {
    if (!value) return { hour: 10, minute: 0, period: "AM" as const };
    const [hStr, mStr] = value.split(":");
    let h = parseInt(hStr || "10", 10);
    const m = parseInt(mStr || "0", 10);
    const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return { hour: h, minute: isNaN(m) ? 0 : m, period };
  }, [value]);

  const [tempHour, setTempHour] = React.useState<number>(parsed.hour);
  const [tempMinute, setTempMinute] = React.useState<number>(parsed.minute);
  const [tempPeriod, setTempPeriod] = React.useState<"AM" | "PM">(parsed.period);

  // Sincronizar al abrir el dropdown
  React.useEffect(() => {
    if (open) {
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
      setMode("hours");
    }
  }, [open, parsed]);

  const displayStr = React.useMemo(() => {
    if (!value) return "";
    return `${parsed.hour}:${String(parsed.minute).padStart(2, "0")} ${parsed.period}`;
  }, [value, parsed]);

  const handleConfirm = () => {
    let h24 = tempHour % 12;
    if (tempPeriod === "PM") h24 += 12;
    const hStr = String(h24).padStart(2, "0");
    const mStr = String(tempMinute).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    setOpen(false);
  };

  const handleHourClick = (h: number) => {
    setTempHour(h);
    // Cambiar a minutos automáticamente al seleccionar la hora
    setMode("minutes");
  };

  const handleMinuteClick = (m: number) => {
    setTempMinute(m);
  };

  // Coordenadas de la manecilla
  const activeAngleRad = React.useMemo(() => {
    if (mode === "hours") {
      return (tempHour * 30 - 90) * (Math.PI / 180);
    } else {
      return (tempMinute * 6 - 90) * (Math.PI / 180);
    }
  }, [mode, tempHour, tempMinute]);

  const handX = DIAL_CENTER + DIAL_RADIUS * Math.cos(activeAngleRad);
  const handY = DIAL_CENTER + DIAL_RADIUS * Math.sin(activeAngleRad);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-display font-black text-slate-900 dark:text-slate-100 shadow-2xs cursor-pointer transition-all hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            !value && "text-muted-foreground font-sans font-normal",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate font-display">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{displayStr || placeholder}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        className="w-[230px] p-2.5 z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-2 font-display select-none"
      >
        {/* Pantalla Digital Superior + Selector AM / PM */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 font-display">
            {/* Cuadro de Hora */}
            <button
              type="button"
              onClick={() => setMode("hours")}
              className={cn(
                "w-10 h-8 rounded-lg flex items-center justify-center text-lg font-black font-display tracking-tight transition-all cursor-pointer",
                mode === "hours"
                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
              )}
            >
              {tempHour}
            </button>

            <span className="text-base font-black text-slate-400 pb-0.5">:</span>

            {/* Cuadro de Minutos */}
            <button
              type="button"
              onClick={() => setMode("minutes")}
              className={cn(
                "w-10 h-8 rounded-lg flex items-center justify-center text-lg font-black font-display tracking-tight transition-all cursor-pointer",
                mode === "minutes"
                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
              )}
            >
              {String(tempMinute).padStart(2, "0")}
            </button>
          </div>

          {/* Selector Vertical AM / PM */}
          <div className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden font-display text-[10px] font-black shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setTempPeriod("AM")}
              className={cn(
                "px-2.5 py-1 transition-all cursor-pointer font-display",
                tempPeriod === "AM"
                  ? "bg-primary text-primary-foreground font-black"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              )}
            >
              AM
            </button>
            <div className="h-[1px] bg-slate-200 dark:bg-slate-800" />
            <button
              type="button"
              onClick={() => setTempPeriod("PM")}
              className={cn(
                "px-2.5 py-1 transition-all cursor-pointer font-display",
                tempPeriod === "PM"
                  ? "bg-primary text-primary-foreground font-black"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              )}
            >
              PM
            </button>
          </div>
        </div>

        {/* Esfera del Reloj Análogo */}
        <div className="w-[140px] h-[140px] rounded-full bg-slate-100 dark:bg-slate-800/60 mx-auto relative select-none shadow-inner font-display">
          {/* Manecilla SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <line
              x1={DIAL_CENTER}
              y1={DIAL_CENTER}
              x2={handX}
              y2={handY}
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
            <circle cx={DIAL_CENTER} cy={DIAL_CENTER} r="2.5" fill="currentColor" className="text-primary" />
          </svg>

          {/* Números de la Esfera */}
          {mode === "hours"
            ? HOURS.map((h) => {
                const angleRad = (h * 30 - 90) * (Math.PI / 180);
                const posX = DIAL_CENTER + DIAL_RADIUS * Math.cos(angleRad);
                const posY = DIAL_CENTER + DIAL_RADIUS * Math.sin(angleRad);
                const isSelected = tempHour === h;

                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourClick(h)}
                    style={{
                      left: `${posX}px`,
                      top: `${posY}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute w-6 h-6 rounded-full text-[11px] font-display flex items-center justify-center transition-all cursor-pointer z-10",
                      isSelected
                        ? "bg-primary text-primary-foreground font-black shadow-xs scale-105"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 font-bold"
                    )}
                  >
                    {h}
                  </button>
                );
              })
            : MINUTES.map((m) => {
                const angleRad = (m * 6 - 90) * (Math.PI / 180);
                const posX = DIAL_CENTER + DIAL_RADIUS * Math.cos(angleRad);
                const posY = DIAL_CENTER + DIAL_RADIUS * Math.sin(angleRad);
                const isSelected = tempMinute === m;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteClick(m)}
                    style={{
                      left: `${posX}px`,
                      top: `${posY}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute w-6 h-6 rounded-full text-[10px] font-display flex items-center justify-center transition-all cursor-pointer z-10",
                      isSelected
                        ? "bg-primary text-primary-foreground font-black shadow-xs scale-105"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 font-bold"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                );
              })}
        </div>

        {/* Footer con CANCEL y OK */}
        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40 font-display">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-display font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer uppercase tracking-wider"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3.5 py-1 rounded-lg text-[10.5px] font-display font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs transition-all cursor-pointer uppercase tracking-wider active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
