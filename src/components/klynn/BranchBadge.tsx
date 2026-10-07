import React from "react";
import { Star, Store } from "lucide-react";
import { getTenantBranchName, isTenantPrincipal } from "@/lib/storage";

export const SUCURSAL_PASTEL_PALETTES = [
  {
    // 0: Esmeralda pastel
    badge: "bg-emerald-50 text-emerald-900 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/70",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  {
    // 1: Púrpura / Lavanda pastel
    badge: "bg-purple-50 text-purple-900 border-purple-200/90 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800/70",
    icon: "text-purple-600 dark:text-purple-400",
  },
  {
    // 2: Sky / Azul cielo pastel
    badge: "bg-sky-50 text-sky-900 border-sky-200/90 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/70",
    icon: "text-sky-600 dark:text-sky-400",
  },
  {
    // 3: Rose / Rosa pastel
    badge: "bg-rose-50 text-rose-900 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/70",
    icon: "text-rose-600 dark:text-rose-400",
  },
  {
    // 4: Teal / Turquesa pastel
    badge: "bg-teal-50 text-teal-900 border-teal-200/90 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800/70",
    icon: "text-teal-600 dark:text-teal-400",
  },
  {
    // 5: Indigo pastel
    badge: "bg-indigo-50 text-indigo-900 border-indigo-200/90 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800/70",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  {
    // 6: Naranja suave / Melocotón pastel
    badge: "bg-orange-50 text-orange-900 border-orange-200/90 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/70",
    icon: "text-orange-600 dark:text-orange-400",
  },
  {
    // 7: Cian / Hielo pastel
    badge: "bg-cyan-50 text-cyan-900 border-cyan-200/90 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800/70",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  {
    // 8: Fucsia pastel
    badge: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200/90 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800/70",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    // 9: Lima suave pastel
    badge: "bg-lime-50 text-lime-900 border-lime-200/90 dark:bg-lime-950/40 dark:text-lime-200 dark:border-lime-800/70",
    icon: "text-lime-600 dark:text-lime-400",
  },
  {
    // 10: Violeta pastel
    badge: "bg-violet-50 text-violet-900 border-violet-200/90 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800/70",
    icon: "text-violet-600 dark:text-violet-400",
  },
  {
    // 11: Canela suave pastel
    badge: "bg-amber-50/70 text-amber-950 border-amber-200/70 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/60",
    icon: "text-amber-600 dark:text-amber-400",
  },
];

export function getBranchBadgeInfo(t: any, allTenants?: any[], itemIndex?: number) {
  const isMatriz = Boolean(
    isTenantPrincipal(t) ||
    (!t?.parent_tenant_id && !t?.config?.parent_tenant_id && (!allTenants || allTenants.length === 0 || allTenants[0]?.id === t?.id))
  );

  if (isMatriz) {
    return {
      isMatriz: true,
      badgeClass: "bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200/90 dark:border-amber-800/70",
      iconClass: "text-amber-500 fill-amber-500",
      label: getTenantBranchName(t) || "Sucursal principal",
    };
  }

  let satIndex = 0;
  if (allTenants && allTenants.length > 0) {
    const satellites = allTenants.filter(
      (x) => !isTenantPrincipal(x) && (x.parent_tenant_id || x.config?.parent_tenant_id || x.id !== allTenants[0]?.id)
    );
    const foundIdx = satellites.findIndex((x) => x.id === t?.id);
    if (foundIdx >= 0) {
      satIndex = foundIdx;
    } else if (itemIndex !== undefined && itemIndex > 0) {
      satIndex = itemIndex - 1;
    }
  } else if (itemIndex !== undefined) {
    satIndex = itemIndex;
  } else if (t?.id) {
    let sum = 0;
    for (let i = 0; i < t.id.length; i++) sum += t.id.charCodeAt(i);
    satIndex = sum;
  }

  const palette = SUCURSAL_PASTEL_PALETTES[Math.abs(satIndex) % SUCURSAL_PASTEL_PALETTES.length];
  return {
    isMatriz: false,
    badgeClass: palette.badge,
    iconClass: palette.icon,
    label: getTenantBranchName(t) || "Sucursal",
  };
}

interface BranchBadgeProps {
  tenant: any;
  allTenants?: any[];
  itemIndex?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
  pill?: boolean;
}

export function BranchBadge({
  tenant,
  allTenants,
  itemIndex,
  size = "sm",
  className = "",
  pill = true,
}: BranchBadgeProps) {
  const info = getBranchBadgeInfo(tenant, allTenants, itemIndex);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-1",
    sm: "px-2 py-0.5 text-[10px] gap-1.5",
    md: "px-2.5 py-1 text-[11px] gap-1.5",
  }[size];

  const iconSizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  }[size];

  const roundedClass = pill ? "rounded-full" : "rounded-md";

  return (
    <span
      className={`inline-flex items-center font-bold border shadow-2xs max-w-full ${roundedClass} ${sizeClasses} ${info.badgeClass} ${className}`}
      title={info.isMatriz ? "Sucursal Matriz (Principal)" : "Sucursal satélite"}
    >
      {info.isMatriz ? (
        <Star className={`${iconSizes} fill-amber-500 text-amber-500 shrink-0`} />
      ) : (
        <Store className={`${iconSizes} shrink-0 ${info.iconClass}`} />
      )}
      <span className="truncate">{info.label}</span>
    </span>
  );
}
