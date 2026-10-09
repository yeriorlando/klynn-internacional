import React from "react";
import {
  Tag,
  Package,
  ShoppingBag,
  Sparkles,
  Droplets,
  Boxes,
  Shirt,
  Layers,
  type LucideProps,
} from "lucide-react";

export interface ArticuloIconOption {
  id: string;
  label: string;
  Icon: React.ComponentType<LucideProps>;
}

export const ARTICULO_ICONS: ArticuloIconOption[] = [
  { id: "tag", label: "Etiqueta", Icon: Tag },
  { id: "package", label: "Paquete", Icon: Package },
  { id: "shopping-bag", label: "Bolsa", Icon: ShoppingBag },
  { id: "sparkles", label: "Limpieza", Icon: Sparkles },
  { id: "droplets", label: "Líquidos", Icon: Droplets },
  { id: "boxes", label: "Caja", Icon: Boxes },
  { id: "shirt", label: "Textil", Icon: Shirt },
  { id: "layers", label: "Insumos", Icon: Layers },
];

export function ArticuloIcon({
  name,
  className = "h-5 w-5",
  ...props
}: {
  name?: string | null;
  className?: string;
} & LucideProps) {
  const clean = (name || "").toLowerCase().trim();
  const found = ARTICULO_ICONS.find(
    (item) => item.id === clean || item.id === clean.replace(/\s+/g, "-")
  );
  const Component = found ? found.Icon : Tag;
  return <Component className={className} {...props} />;
}
