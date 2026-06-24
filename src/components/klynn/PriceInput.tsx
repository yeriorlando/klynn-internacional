import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatAmountInput, parseAmount } from "@/lib/storage";

interface PriceInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export function PriceInput({ value, onChange, className, placeholder }: PriceInputProps) {
  const [localVal, setLocalVal] = useState<string>("");

  // Sync with outer value when it changes
  useEffect(() => {
    // If the parsed numeric value of localVal is the same as the external value,
    // we don't overwrite it. This preserves active typing states (like trailing dots or zeros).
    if (parseAmount(localVal) !== value) {
      setLocalVal(value ? formatAmountInput(String(value)) : "");
    }
  }, [value, localVal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
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

  const handleBlur = () => {
    // Standardize representation on blur
    setLocalVal(value ? formatAmountInput(String(value)) : "");
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
    />
  );
}
