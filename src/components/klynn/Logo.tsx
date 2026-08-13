import { Droplets } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  iconColor?: string;
  variant?: "default" | "white";
  to?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "", iconColor, variant = "default", to = "/" }: LogoProps) {
  const dim = {
    sm: "h-7 w-7",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-20 w-20"
  }[size];

  const imgHeight = {
    sm: "h-9",
    md: "h-14 md:h-[68px]",
    lg: "h-20 md:h-24",
    xl: "h-28 md:h-32"
  }[size];

  const isWhite = variant === "white" || Boolean(iconColor);

  return (
    <Link to={to} className={`inline-flex items-center transition-opacity hover:opacity-80 ${className}`}>
      {showWordmark ? (
        <img
          src="/Logo klynn.webp"
          alt="Klynn"
          className={`${imgHeight} w-auto object-contain shrink-0 ${isWhite ? "brightness-0 invert" : ""}`}
        />
      ) : (
        <div className={`${dim} flex items-center justify-center`}>
          <Droplets 
            className={`h-full w-full ${iconColor ? "" : "text-[#1B4B73]"}`} 
            style={iconColor ? { color: iconColor } : {}}
            strokeWidth={2.2} 
          />
        </div>
      )}
    </Link>
  );
}

