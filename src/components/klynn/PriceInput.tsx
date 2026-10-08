import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { parseAmount, getActiveTenantLocalization } from "@/lib/storage";

export interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | undefined | null;
  onChange: (val: number) => void;
  decimals?: number;
  className?: string;
  placeholder?: string;
}

export function PriceInput({
  value,
  onChange,
  decimals,
  className,
  placeholder = "0.00",
  ...props
}: PriceInputProps) {
  const activeLoc = getActiveTenantLocalization();
  const targetDecimals = decimals !== undefined ? decimals : (activeLoc?.decimals ?? 0);

  const formatForDisplay = (val: number | undefined | null): string => {
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: targetDecimals,
      maximumFractionDigits: targetDecimals,
    }).format(targetDecimals === 0 ? Math.round(num) : num);
  };

  const [localVal, setLocalVal] = useState<string>(() => formatForDisplay(value));
  const isFocusedRef = useRef(false);

  // Sincronizar con el valor externo cuando cambia y el usuario no está escribiendo activamente
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalVal(formatForDisplay(value));
    }
  }, [value, targetDecimals]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    props.onFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Para monedas sin decimales (RD$, etc.): solo dígitos enteros, sin puntos ni comas
    if (targetDecimals === 0) {
      const digitsOnly = raw.replace(/[^\d]/g, "");
      if (digitsOnly === "") {
        setLocalVal("");
        onChange(0);
        return;
      }
      const intNum = Number(digitsOnly.replace(/^0+(?=\d)/, "") || "0");
      const formatted = new Intl.NumberFormat("en-US").format(intNum);
      setLocalVal(formatted);
      onChange(intNum);
      return;
    }

    // Para monedas internacionales con decimales (México, Ecuador, etc.):
    // Normalizar comas a puntos para teclados en español y móviles
    if (raw.endsWith(",")) {
      raw = raw.slice(0, -1) + ".";
    } else if (raw.includes(",")) {
      if (!raw.includes(".")) {
        const lastCommaIdx = raw.lastIndexOf(",");
        raw = raw.substring(0, lastCommaIdx) + "." + raw.substring(lastCommaIdx + 1);
      }
    }

    // Permitir solo dígitos y un único punto
    let cleaned = raw.replace(/[^\d.]/g, "");

    // Si comienza con punto (".50" -> "0.50")
    if (cleaned.startsWith(".")) {
      cleaned = "0" + cleaned;
    }

    // Garantizar que solo haya un punto
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    // Limitar cantidad de decimales según la configuración
    const maxDec = targetDecimals;
    if (parts.length === 2 && parts[1].length > maxDec) {
      cleaned = `${parts[0]}.${parts[1].slice(0, maxDec)}`;
    }

    // Formatear parte entera manteniendo decimales que se están escribiendo
    let formatted = cleaned;
    if (cleaned === "") {
      formatted = "";
    } else if (cleaned.endsWith(".")) {
      const intPart = cleaned.split(".")[0];
      const intNum = Number(intPart.replace(/^0+(?=\d)/, "") || "0");
      formatted = `${new Intl.NumberFormat("en-US").format(intNum)}.`;
    } else if (cleaned.includes(".")) {
      const [intPart, decPart] = cleaned.split(".");
      const intNum = Number(intPart.replace(/^0+(?=\d)/, "") || "0");
      formatted = `${new Intl.NumberFormat("en-US").format(intNum)}.${decPart}`;
    } else {
      const intNum = Number(cleaned.replace(/^0+(?=\d)/, "") || "0");
      formatted = new Intl.NumberFormat("en-US").format(intNum);
    }

    setLocalVal(formatted);
    onChange(parseAmount(formatted));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    const parsed = parseAmount(localVal);
    if (parsed > 0) {
      setLocalVal(formatForDisplay(parsed));
      onChange(targetDecimals === 0 ? Math.round(parsed) : parsed);
    } else {
      setLocalVal("");
      onChange(0);
    }
    props.onBlur?.(e);
  };

  const effectivePlaceholder =
    targetDecimals === 0 && (placeholder === "0.00" || placeholder.includes("."))
      ? (placeholder.split(".")[0] || "0")
      : placeholder;

  return (
    <Input
      type="text"
      inputMode={targetDecimals === 0 ? "numeric" : "decimal"}
      className={className}
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={effectivePlaceholder}
      {...props}
    />
  );
}

