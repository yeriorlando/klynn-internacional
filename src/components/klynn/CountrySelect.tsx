import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES, getCountry, type CountryConfig } from "../../lib/countries";

interface CountrySelectProps {
  value: string;
  onChange: (country: CountryConfig) => void;
  className?: string;
  buttonClassName?: string;
}

export function CountrySelect({ value, onChange, className = "", buttonClassName }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(() => getCountry(value), [value]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return COUNTRIES.filter((c) => {
      const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const code = c.code.toLowerCase();
      const curr = c.currency.code.toLowerCase();
      const tax = c.tax.name.toLowerCase();
      return name.includes(q) || code.includes(q) || curr.includes(q) || tax.includes(q);
    });
  }, [search]);

  function handleSelect(country: CountryConfig) {
    onChange(country);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Trigger Principal */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          buttonClassName ||
          "group flex h-13 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card px-3.5 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.99]"
        }
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Bandera Circular */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-xs ring-2 ring-white dark:ring-slate-900">
            <img
              src={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png`}
              alt={selectedCountry.name}
              className="h-full w-full object-cover scale-110 rounded-full"
              loading="lazy"
            />
          </div>

          {/* Nombre de País en Plus Jakarta Sans */}
          <div className="flex flex-col text-left truncate">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {selectedCountry.name}
            </span>
          </div>
        </div>

        {/* Badges Rediseñados: Moneda & Impuesto (Plus Jakarta Sans, Colores Fintech Vivos) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Badge Moneda: Estilo Fintech Esmeralda */}
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50/90 px-2.5 py-1 text-emerald-800 border border-emerald-200/70 shadow-2xs">
            <span className="text-xs font-extrabold tracking-tight text-emerald-950">
              {selectedCountry.currency.code}
            </span>
            <span className="text-xs font-black text-emerald-600">
              ({selectedCountry.currency.symbol})
            </span>
          </div>

          {/* Badge Impuesto: Estilo Indigo Moderno */}
          <div className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50/90 px-2.5 py-1 text-indigo-800 border border-indigo-200/70 shadow-2xs">
            <span className="text-xs font-bold tracking-tight text-indigo-950">
              {selectedCountry.tax.name}
            </span>
            <span className="text-xs font-extrabold text-indigo-600">
              {selectedCountry.tax.defaultRate}%
            </span>
          </div>

          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : "group-hover:text-slate-600"
            }`}
          />
        </div>
      </button>

      {/* Menú Desplegable con Animación y Buscador */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50 mt-1 max-h-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-xl ring-1 ring-black/5"
          >
            {/* Buscador de países */}
            <div className="sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-card/95 p-2.5 backdrop-blur-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar país, moneda o impuesto..."
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:bg-white dark:focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Lista de países */}
            <div className="max-h-68 overflow-y-auto p-1.5 space-y-1">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No se encontraron países para "{search}"
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? "bg-primary/[0.07] dark:bg-primary/20 text-primary shadow-2xs ring-1 ring-primary/20"
                          : "hover:bg-slate-50/90 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Bandera Circular Nítida */}
                        <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs ring-1 ring-slate-100 dark:ring-slate-800">
                          <img
                            src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`}
                            alt={c.name}
                            className="h-full w-full object-cover scale-110 rounded-full"
                            loading="lazy"
                          />
                        </div>

                        {/* Información del País */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                              {c.name}
                            </span>
                            {c.hasFiscalEcf && (
                              <span className="rounded-full bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300/50 dark:border-emerald-700/50 px-2 py-0.2 text-[9px] font-black text-emerald-800 dark:text-emerald-300">
                                DGII e-CF
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            {c.regions.length} {c.regionsLabel.toLowerCase()} · Doc: {c.doc.label}
                          </span>
                        </div>
                      </div>

                      {/* Badges de Moneda e Impuestos Rediseñados */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Moneda: Pastilla Esmeralda */}
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                          <span className="text-[11px] font-extrabold text-emerald-950 dark:text-emerald-200">
                            {c.currency.code}
                          </span>
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            {c.currency.symbol}
                          </span>
                        </div>

                        {/* Impuesto: Pastilla Indigo */}
                        <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                          <span className="text-[10.5px] font-bold text-indigo-950 dark:text-indigo-200">
                            {c.tax.name}
                          </span>
                          <span className="text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">
                            {c.tax.defaultRate}%
                          </span>
                        </div>

                        <div className="w-5 flex items-center justify-center">
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
