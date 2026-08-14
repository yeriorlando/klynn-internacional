import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Navigation, Check, X, Sparkles, Building, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AddressData {
  direccion: string;
  sector?: string;
  edificio_apto?: string;
  referencia?: string;
  lat?: number;
  lng?: number;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
  label?: string;
  required?: boolean;
  showDetails?: boolean;
}

interface GeocodeResult {
  name: string;
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
  formatted: string;
  lat: number;
  lng: number;
}

export function AddressAutocomplete({
  value,
  onChange,
  label = "Dirección de Entrega",
  required = false,
  showDetails = true,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value.direccion || "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const lastSelectedQueryRef = useRef<string | null>(value.direccion || null);

  useEffect(() => {
    if (value.direccion !== query) {
      lastSelectedQueryRef.current = value.direccion || null;
      setQuery(value.direccion || "");
    }
  }, [value.direccion]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Strict bounding box for Dominican Republic
  const isDominicanRepublic = (lat?: number, lng?: number, country?: string) => {
    if (country) {
      const c = country.toLowerCase();
      if (c.includes("dominic") || c === "do" || c.includes("república dominicana") || c.includes("republica dominicana")) {
        return true;
      }
      if (c && !c.includes("dominic") && !c.includes("republica") && !c.includes("república")) {
        return false;
      }
    }
    if (lat !== undefined && lng !== undefined) {
      // DR territory coordinates: 17.40 to 20.05 Lat, -72.10 to -68.25 Lng
      return lat >= 17.40 && lat <= 20.05 && lng >= -72.10 && lng <= -68.25;
    }
    return true;
  };

  // Debounced API search strictly locked to Dominican Republic
  useEffect(() => {
    // If the query was set programmatically by selecting a result, don't trigger search
    if (isSelectingRef.current || (lastSelectedQueryRef.current && query === lastSelectedQueryRef.current)) {
      isSelectingRef.current = false;
      setLoading(false);
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const rawQ = query.trim();
        const encodedQ = encodeURIComponent(rawQ);

        // 1. Fetch from Photon with RD bias and bounding box
        const photonUrl = `https://photon.komoot.io/api/?q=${encodedQ}&limit=10&lat=18.4861&lon=-69.9312&bbox=-72.05,17.40,-68.25,20.05`;
        
        // 2. Fetch from Nominatim (Strict countrycodes=do and RD viewbox)
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQ}&countrycodes=do&format=json&addressdetails=1&limit=8`;

        const [photonRes, nominatimRes] = await Promise.allSettled([
          fetch(photonUrl),
          fetch(nominatimUrl, { headers: { "Accept-Language": "es" } })
        ]);

        // Don't update if user selected something while fetching
        if (isSelectingRef.current) {
          setLoading(false);
          return;
        }

        const combinedResults: GeocodeResult[] = [];
        const seenNames = new Set<string>();

        // Process Nominatim results (100% strictly Dominican Republic)
        if (nominatimRes.status === "fulfilled" && nominatimRes.value.ok) {
          const nomData = await nominatimRes.value.json();
          if (Array.isArray(nomData)) {
            nomData.forEach((item: any) => {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isDominicanRepublic(lat, lng, item.address?.country)) {
                const addr = item.address || {};
                const name = item.name || addr.road || item.display_name.split(",")[0] || "Lugar en RD";
                const sector = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.district || addr.town || addr.city || "";
                const city = addr.city || addr.town || addr.state || "Santo Domingo";

                const key = `${name.toLowerCase()}-${lat.toFixed(3)}`;
                if (!seenNames.has(key)) {
                  seenNames.add(key);
                  combinedResults.push({
                    name,
                    street: addr.road,
                    district: sector,
                    city: city,
                    state: addr.state,
                    country: "República Dominicana",
                    formatted: item.display_name,
                    lat,
                    lng,
                  });
                }
              }
            });
          }
        }

        // Process Photon results (filtering out any non-DR result strictly)
        if (photonRes.status === "fulfilled" && photonRes.value.ok) {
          const phoData = await photonRes.value.json();
          if (phoData && Array.isArray(phoData.features)) {
            phoData.features.forEach((f: any) => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [0, 0];
              const lng = coords[0];
              const lat = coords[1];

              // STRICT VALIDATION: Must be inside Dominican Republic bounds
              if (isDominicanRepublic(lat, lng, p.country)) {
                const name = p.name || p.street || "Lugar en RD";
                const sector = p.district || p.suburb || p.city || p.county || "";
                const key = `${name.toLowerCase()}-${lat.toFixed(3)}`;

                if (!seenNames.has(key)) {
                  seenNames.add(key);
                  const parts = [
                    p.name,
                    p.street,
                    p.district || p.suburb,
                    p.city || p.county,
                    p.state,
                  ].filter(Boolean);

                  combinedResults.push({
                    name,
                    street: p.street,
                    district: sector,
                    city: p.city || p.county,
                    state: p.state,
                    country: "República Dominicana",
                    formatted: Array.from(new Set(parts)).join(", "),
                    lat,
                    lng,
                  });
                }
              }
            });
          }
        }

        setResults(combinedResults.slice(0, 7));
        setIsOpen(combinedResults.length > 0);
      } catch (err) {
        console.error("Geocoding lookup error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (item: GeocodeResult) => {
    isSelectingRef.current = true;
    lastSelectedQueryRef.current = item.formatted;
    setQuery(item.formatted);
    setResults([]);
    setIsOpen(false);
    setLoading(false);
    onChange({
      ...value,
      direccion: item.formatted,
      sector: item.district || item.city || value.sector,
      lat: item.lat,
      lng: item.lng,
    });
  };

  const openWazePreview = () => {
    if (value.lat && value.lng) {
      window.open(`https://waze.com/ul?ll=${value.lat},${value.lng}&navigate=yes`, "_blank");
    } else if (value.direccion) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(value.direccion)}`, "_blank");
    }
  };

  const openGoogleMapsPreview = () => {
    if (value.lat && value.lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`, "_blank");
    } else if (value.direccion) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.direccion)}`, "_blank");
    }
  };

  return (
    <div className="space-y-2.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </Label>
        {(value.lat || value.direccion) && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openWazePreview}
              title="Probar en Waze"
              className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600 hover:bg-sky-100 transition-colors"
            >
              <Compass className="h-3 w-3" /> Waze
            </button>
            <button
              type="button"
              onClick={openGoogleMapsPreview}
              title="Probar en Google Maps"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Navigation className="h-3 w-3" /> Maps
            </button>
          </div>
        )}
      </div>

      {/* Autocomplete Input */}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => {
            isSelectingRef.current = false;
            lastSelectedQueryRef.current = null;
            setQuery(e.target.value);
            onChange({ ...value, direccion: e.target.value });
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Escribe calle, número, torre o sector..."
          className="h-10 pl-9 pr-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus-visible:ring-primary/20"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              isSelectingRef.current = false;
              lastSelectedQueryRef.current = null;
              setQuery("");
              setResults([]);
              setIsOpen(false);
              setLoading(false);
              onChange({ ...value, direccion: "", lat: undefined, lng: undefined });
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}

        {/* Results Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 shadow-xl max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-1">
              <Search className="h-3 w-3 text-slate-400" />
              <span>Lugares encontrados</span>
            </div>
            {results.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition flex items-start gap-2 text-xs group"
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.formatted}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Structured Details (Edificio/Apto, Referencia & Sector) */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <Label className="text-[10px] font-bold text-slate-500">Edificio / Apto / Nivel</Label>
            <div className="relative mt-1">
              <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={value.edificio_apto || ""}
                onChange={(e) => onChange({ ...value, edificio_apto: e.target.value })}
                placeholder="Ej. Torre Bella, Apto 4B"
                className="h-8.5 pl-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-bold text-slate-500">Sector / Barrio</Label>
            <Input
              value={value.sector || ""}
              onChange={(e) => onChange({ ...value, sector: e.target.value })}
              placeholder="Ej. Piantini"
              className="h-8.5 mt-1 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] font-bold text-slate-500">Punto de Referencia (Para el Repartidor)</Label>
            <Input
              value={value.referencia || ""}
              onChange={(e) => onChange({ ...value, referencia: e.target.value })}
              placeholder="Ej. Portón negro frente al parque, tocar timbre 4B..."
              className="h-8.5 mt-1 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
