import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatAmountInput, parseAmount } from "@/lib/storage";

export interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | undefined | null;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export function PriceInput({ value, onChange, className, placeholder, ...props }: PriceInputProps) {
  const [localVal, setLocalVal] = useState<string>(() => {
    const num = Number(value) || 0;
    return num > 0 ? formatAmountInput(String(num)) : "";
  });

  // Sync with outer value when it changes externally
  useEffect(() => {
    const num = Number(value) || 0;
    if (parseAmount(localVal) !== num) {
      setLocalVal(num > 0 ? formatAmountInput(String(num)) : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Support comma as decimal separator (standard on Spanish mobile keypads and European numpads)
    if (!raw.includes(".") && (/,\d{1,2}$/.test(raw) || raw.endsWith(","))) {
      raw = raw.replace(/,(\d{1,2})?$/, (m, dec) => (dec !== undefined ? `.${dec}` : "."));
    }

    // Clean characters (only allow numbers and at most one dot)
    let cleaned = raw.replace(/[^\d.]/g, "");
    
    // Ensure only one dot exists
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }

    // Format integer part, leaving partial decimal input intact
    let formatted = cleaned;
    if (cleaned === "") {
      formatted = "";
    } else if (cleaned.endsWith(".")) {
      const intPart = cleaned.split(".")[0];
      formatted = `${formatAmountInput(intPart)}.`;
    } else if (cleaned.includes(".")) {
      const [intPart, decPart] = cleaned.split(".");
      formatted = `${formatAmountInput(intPart)}.${decPart}`;
    } else {
      formatted = formatAmountInput(cleaned);
    }

    setLocalVal(formatted);
    onChange(parseAmount(formatted));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = Number(value) || 0;
    if (num > 0) {
      const cleanedLocal = localVal.endsWith(".") ? localVal.slice(0, -1) : localVal;
      setLocalVal(cleanedLocal ? formatAmountInput(cleanedLocal) : formatAmountInput(String(num)));
    } else {
      setLocalVal("");
    }
    props.onBlur?.(e);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={className}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      {...props}
    />
  );
}

