"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  setDate?: (date?: Date) => void;
  value?: string;
  onChange?: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ date, setDate, value, onChange, className, placeholder = "Seleccionar fecha" }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Support either Date object or YYYY-MM-DD string
  const resolvedDate = React.useMemo(() => {
    if (date) return date;
    if (value) {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return undefined;
  }, [date, value]);

  const displayStr = React.useMemo(() => {
    if (resolvedDate) {
      return format(resolvedDate, "dd/MM/yyyy", { locale: es });
    }
    return "";
  }, [resolvedDate]);

  const handleSelect = (selectedDate?: Date) => {
    if (setDate) setDate(selectedDate);
    if (onChange && selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm shadow-xs font-sans font-medium text-slate-900 dark:text-slate-100 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-[#1B4B73]/20 focus:border-[#1B4B73]",
            !resolvedDate && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate font-sans font-medium">{displayStr || placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[70] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl" align="start">
        <Calendar
          mode="single"
          selected={resolvedDate}
          onSelect={handleSelect}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DMYDatePicker({
  value,
  onChange,
  onMonthChange,
  className,
  placeholder = "DD/MM/AAAA",
  id,
  disabled = false,
}: {
  value: string; // YYYY-MM-DD format
  onChange: (val: string) => void;
  onMonthChange?: (month: Date) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const dateObj = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return undefined;
  }, [value]);

  const displayStr = React.useMemo(() => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      // Formato estrictamente DÍA/MES/AÑO
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    return value;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm shadow-xs font-sans font-medium text-slate-900 dark:text-slate-100 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-[#1B4B73]/20 focus:border-[#1B4B73] disabled:opacity-50 disabled:pointer-events-none",
            !value && "text-muted-foreground font-normal",
            className
          )}
        >
          <span className="truncate font-sans font-medium">{displayStr || placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[70] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={(d) => {
            if (d) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              onChange(`${yyyy}-${mm}-${dd}`);
            }
            setOpen(false);
          }}
          onMonthChange={onMonthChange}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}
