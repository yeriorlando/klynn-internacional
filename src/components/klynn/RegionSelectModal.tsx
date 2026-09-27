import { useState, useRef, useEffect, useMemo } from "react";
import { Check, Search, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PROVINCIAS_RD } from "@/lib/storage";
import { getCountry } from "@/lib/countries";

export interface RegionSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (region: string) => void;
  value: string;
  countryCode?: string;
  countryName?: string;
  regions?: string[];
  label?: string; // Provincias, Departamentos, Estados, etc.
}

export function RegionSelectModal({
  open,
  onClose,
  onSelect,
  value,
  countryCode = "DO",
  countryName,
  regions,
  label = "Provincias",
}: RegionSelectModalProps) {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentCountry = useMemo(() => getCountry(countryCode), [countryCode]);
  const activeCountryName = countryName || currentCountry.name;
  const regionList = regions && regions.length > 0 ? regions : currentCountry.regions || PROVINCIAS_RD;
  const singularLabel = label.toLowerCase().endsWith("s") ? label.slice(0, -1) : label;

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return regionList;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return regionList.filter((p) => {
      const normalized = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalized.includes(q);
    });
  }, [search, regionList]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="rounded-3xl max-w-lg p-0 overflow-hidden border border-slate-200/90 shadow-2xl bg-white text-foreground flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        {/* Header con Bandera HD, Título y Close Button nativo de DialogContent */}
        <div className="bg-slate-50/70 p-4 relative border-b border-slate-100 pr-14 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bandera Circular Nítida del País */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-xs ring-2 ring-white">
              <img
                src={`https://flagcdn.com/w80/${currentCountry.code.toLowerCase()}.png`}
                alt={activeCountryName}
                className="h-full w-full object-cover scale-110 rounded-full"
                loading="lazy"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 tracking-tight truncate">
                  Selecciona tu {singularLabel}
                </DialogTitle>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 shrink-0">
                  {regionList.length} disponibles
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {activeCountryName} · Ubicación de tu lavandería
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda Idéntica al Estilo CountrySelect */}
        <div className="border-b border-slate-100 bg-white p-3 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${singularLabel.toLowerCase()}...`}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 h-5 w-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 text-xs transition-colors cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Lista Scrollable de Regiones con Estilo Moderno */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Sin resultados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No encontramos ninguna coincidencia para "{search}"
              </p>
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = p === value;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    onClose();
                  }}
                  className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-[#1B4B73] text-white shadow-2xs font-bold"
                      : "text-slate-700 font-medium hover:bg-[#1B4B73] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-white/20 group-hover:text-white"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className={`text-xs sm:text-sm tracking-tight truncate transition-colors duration-150 ${
                      isSelected ? "text-white font-bold" : "text-slate-800 group-hover:text-white"
                    }`}>
                      {p}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        Seleccionado
                      </span>
                      <Check className="h-4 w-4 text-white stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer con Resumen y Botón de Cancelar */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando <strong className="text-slate-800">{filtered.length}</strong> de {regionList.length} {label.toLowerCase()}
          </span>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-9 px-5 text-xs sm:text-sm font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
