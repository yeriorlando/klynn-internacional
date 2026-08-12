import { Droplets } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  iconColor?: string;
  to?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "", iconColor, to = "/" }: LogoProps) {
  const dim = {
    sm: "h-7 w-7",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-20 w-20"
  }[size];

  const text = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
    xl: "text-7xl"
  }[size];
  
  return (
    <Link to={to} className={`flex items-center gap-2 transition-opacity hover:opacity-80 ${className}`}>
      <div className={`${dim} flex items-center justify-center`}>
        <Droplets 
          className={`h-full w-full ${iconColor ? "" : "text-[#1B4B73]"}`} 
          style={iconColor ? { color: iconColor } : {}}
          strokeWidth={2.2} 
        />
      </div>
      {showWordmark && (
        <span className={`font-display ${text} font-black tracking-tighter transition-colors`}>
          Klynn
        </span>
      )}
    </Link>
  );
}
