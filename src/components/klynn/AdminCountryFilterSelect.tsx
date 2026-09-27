import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, Globe, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES, getCountry, type CountryConfig } from "@/lib/countries";
import type { Tenant } from "@/lib/storage";

interface AdminCountryFilterSelectProps {
  value: string; // "all" o código de 2 letras (ej. "DO", "MX")
  onChange: (countryCode: string) => void;
  tenants: Tenant[];
  className?: string;
}

export function AdminCountryFilterSelect({
  value,
  onChange,
  tenants,
  className = "",
}: AdminCountryFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAll = value === "all";
  const selectedCountry: CountryConfig | null = useMemo(() => {
    if (isAll) return null;
    return getCountry(value);
  }, [value, isAll]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Conteo de lavanderías por país
  const tenantCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of COUNTRIES) {
      map[c.code] = 0;
    }
    for (const t of tenants) {
      const code = (t.pais_codigo || "DO").toUpperCase();
      map[code] = (map[code] || 0) + 1;
    }
    return map;
  }, [tenants]);

  // Filtrado de países en el buscador interno del desplegable
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return COUNTRIES.filter((c) => {
      const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const code = c.code.toLowerCase();
      const currCode = c.currency.code.toLowerCase();
      return name.includes(q) || code.includes(q) || currCode.includes(q);
    });
  }, [search]);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("all");
    setSearch("");
  }

  const selectedCount = selectedCountry ? (tenantCounts[selectedCountry.code] || 0) : tenants.length;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Trigger Principal */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex h-10 items-center justify-between gap-2.5 rounded-xl border px-3 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 w-full sm:w-[240px] md:w-[260px] ${
          isAll
            ? "border-border/80 bg-background text-foreground hover:bg-muted/50 hover:border-primary/40"
            : "border-primary/50 bg-primary/5 dark:bg-primary/10 text-primary shadow-xs ring-1 ring-primary/25"
        }`}
        title="Filtrar lavanderías por país"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar / Bandera Circular */}
          {isAll ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/25 shadow-2xs">
              <Globe className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 shadow-2xs ring-1 ring-white/60 dark:ring-slate-800">
              <img
                src={`https://flagcdn.com/w80/${selectedCountry?.code.toLowerCase()}.png`}
                alt={selectedCountry?.name || ""}
                className="h-full w-full object-cover scale-110 rounded-full"
                loading="lazy"
              />
            </div>
          )}

          {/* Nombre */}
          <span className="truncate text-left font-bold text-xs sm:text-sm text-foreground">
            {isAll ? "Todos los países" : selectedCountry?.name}
          </span>
        </div>

        {/* Badges & Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Badge con conteo */}
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              isAll
                ? "bg-muted text-muted-foreground"
                : selectedCount > 0
                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40"
                : "bg-muted/80 text-muted-foreground"
            }`}
          >
            {selectedCount} {selectedCount === 1 ? "lav." : "lavs."}
          </span>

          {/* Botón limpiar si hay filtro activo */}
          {!isAll && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors cursor-pointer"
              title="Quitar filtro de país"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}

          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : "group-hover:text-foreground"
            }`}
          />
        </div>
      </button>

      {/* Menú Desplegable con Animación idéntico al de /registro */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 z-50 mt-1 w-80 sm:w-88 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5"
          >
            {/* Buscador interno */}
            <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 p-2.5 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar país o moneda..."
                  className="h-9 w-full rounded-xl border border-border/80 bg-muted/40 pl-8 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Lista de países */}
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
              {/* Opción Todos los países */}
              {(!search.trim() || "todos los paises general".includes(search.toLowerCase())) && (
                <button
                  type="button"
                  onClick={() => handleSelect("all")}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                    isAll
                      ? "bg-primary/10 text-primary shadow-2xs ring-1 ring-primary/25 font-bold"
                      : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/20 shadow-2xs">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        Todos los países
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        Ver todas las lavanderías de la plataforma
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                      {tenants.length} {tenants.length === 1 ? "lav." : "lavs."}
                    </span>
                    <div className="w-4 flex items-center justify-center">
                      {isAll && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              )}

              {/* Separador */}
              {(!search.trim() || "todos los paises general".includes(search.toLowerCase())) && (
                <div className="border-b border-border/50 my-1" />
              )}

              {/* Países oficiales */}
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No se encontraron países para "{search}"
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = value.toUpperCase() === c.code;
                  const count = tenantCounts[c.code] || 0;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c.code)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 text-primary shadow-2xs ring-1 ring-primary/25 font-bold"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Bandera Circular */}
                        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 shadow-2xs ring-1 ring-white/60 dark:ring-slate-800">
                          <img
                            src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`}
                            alt={c.name}
                            className="h-full w-full object-cover scale-110 rounded-full"
                            loading="lazy"
                          />
                        </div>

                        {/* Información del País */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">
                            {c.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {c.currency.code} ({c.currency.symbol}) · Doc: {c.doc.label}
                          </span>
                        </div>
                      </div>

                      {/* Badges de Moneda, Cantidad y Check */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            count > 0
                              ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40"
                              : "bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {count} {count === 1 ? "lav." : "lavs."}
                        </span>

                        <div className="w-4 flex items-center justify-center">
                          {isSelected && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
