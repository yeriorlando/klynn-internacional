import { motion } from "framer-motion";
import { COUNTRIES } from "@/lib/countries";
import { Sparkles, Check, ChevronRight } from "lucide-react";

interface CountryPillsRibbonProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  className?: string;
}

export function CountryPillsRibbon({ selectedCode, onSelect, className = "" }: CountryPillsRibbonProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Encabezado contextual */}
      <div className="mb-2.5 flex items-center justify-between text-xs px-1">
        <span className="font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Haz clic en tu país para ver cómo se adapta Klynn:
        </span>
        <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
          13 países disponibles
        </span>
      </div>

      {/* Lista de píldoras scrolleable horizontalmente con scroll suave */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar px-0.5">
        {COUNTRIES.map((c) => {
          const isSelected = c.code.toUpperCase() === selectedCode.toUpperCase();
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelect(c.code)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                isSelected
                  ? "bg-[#1B4B73] border-[#1B4B73] text-white shadow-sm ring-2 ring-[#1B4B73]/25 scale-[1.03]"
                  : "bg-surface border-border/80 text-foreground hover:bg-muted/70 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span>{c.name}</span>
              {isSelected && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#F0B900]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
