import { useEffect } from "react";
import type { Tenant } from "@/lib/storage";

/** Aplica los colores del tenant como CSS variables overrideando --primary y derivados. */
export function BrandStyle({ tenant }: { tenant: Tenant }) {
  useEffect(() => {
    const root = document.documentElement;
    const primary = tenant.color_primario || "#1B4B73";
    const secondary = tenant.color_secundario || "#F0B900";
    const useSecondary = tenant.config?.usar_color_secundario ?? false;

    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-secondary", secondary);
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--primary-glow", useSecondary ? secondary : primary);
    root.style.setProperty("--ring", primary);

    return () => {
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--ring");
    };
  }, [tenant.color_primario, tenant.color_secundario, tenant.config?.usar_color_secundario]);
  return null;
}
