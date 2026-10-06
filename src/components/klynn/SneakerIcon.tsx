import React from "react";

export function SneakerIcon({
  className = "h-4 w-4",
  strokeWidth = 2,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14.1 7.9 12.5 10" />
      <path d="M17.4 10.1 16 12" />
      <path d="M2 16a2 2 0 0 0 2 2h13c2.8 0 5-2.2 5-5a2 2 0 0 0-2-2c-.8 0-1.6-.2-2.2-.7l-6.2-4.2c-.4-.3-.9-.2-1.3.1 0 0-.6.8-1.2 1.1a3.5 3.5 0 0 1-4.2.1C4.4 7 3.7 6.3 3.7 6.3A.92.92 0 0 0 2 7Z" />
      <path d="M2 11c0 1.7 1.3 3 3 3h7" />
    </svg>
  );
}

/**
 * Determina si un ítem representa calzado (tenis, zapatos, botas, etc.)
 */
export function isCalzadoItem(it?: {
  es_calzado?: boolean;
  descripcion?: string;
  nombre?: string;
  categoria?: string;
  icono?: string;
}): boolean {
  if (!it) return false;
  if (it.es_calzado) return true;
  if (it.icono === "👟" || it.icono === "👞" || it.icono === "🥾" || it.icono === "👠") return true;

  const text = `${it.categoria || ""} ${it.nombre || ""} ${it.descripcion || ""}`.toLowerCase();
  const clean = text.replace(/^[↳\s*]+/, "");
  return (
    clean.includes("calzado") ||
    clean.includes("tenis") ||
    clean.includes("zapat") ||
    clean.includes("sneaker") ||
    clean.includes("bota") ||
    clean.includes("mocas") ||
    clean.includes("sandalia") ||
    clean.includes("tacón") ||
    clean.includes("tacon")
  );
}
