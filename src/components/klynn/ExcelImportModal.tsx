import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shirt,
  Sparkles,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import {
  parseCatalogExcelFile,
  downloadPrendasTemplate,
  downloadServiciosTemplate,
  type ExcelParseResult,
} from "@/lib/excel-catalog";
import {
  saveCatalogoItem,
  saveServicio,
  uid,
  formatRD,
  type CatalogoItem,
  type Servicio,
} from "@/lib/storage";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  currentPrendas: CatalogoItem[];
  currentServicios: Servicio[];
  tenantName?: string;
  mode?: "prendas" | "servicios" | "all";
}

export function ExcelImportModal({
  open,
  onOpenChange,
  tenantId,
  currentPrendas,
  currentServicios,
  mode = "prendas",
}: ExcelImportModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);

  const isPrendasMode = mode === "prendas";
  const isServiciosMode = mode === "servicios";

  const resetState = () => {
    setFile(null);
    setLoading(false);
    setImporting(false);
    setParseResult(null);
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls") &&
      !selectedFile.name.endsWith(".csv")
    ) {
      toast.error("Formato no soportado. Por favor sube un archivo Excel (.xlsx, .xls) o .csv");
      return;
    }

    try {
      setFile(selectedFile);
      setLoading(true);
      const res = await parseCatalogExcelFile(selectedFile);
      setParseResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verifica el archivo";
      toast.error("Error al leer el archivo Excel: " + msg);
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;

    try {
      setImporting(true);

      // 1. Guardar prendas si aplica
      if (!isServiciosMode && parseResult.prendas.length > 0) {
        for (const p of parseResult.prendas) {
          let existing = p.id ? currentPrendas.find((x) => x.id === p.id) : undefined;
          if (!existing) {
            existing = currentPrendas.find(
              (x) =>
                x.nombre.toLowerCase().trim() === p.nombre.toLowerCase().trim() &&
                x.categoria.toLowerCase().trim() === p.categoria.toLowerCase().trim(),
            );
          }

          const item: CatalogoItem = {
            id: existing?.id || p.id || uid("cat"),
            tenant_id: tenantId,
            categoria: p.categoria || "General",
            nombre: p.nombre,
            descripcion: p.descripcion || existing?.descripcion,
            precio: p.precio,
            por_libra: p.por_libra,
            is_exento: p.is_exento,
            activo: p.activo,
            icono: existing?.icono || "👕",
            imagen_url: existing?.imagen_url,
          };
          await saveCatalogoItem(item);
        }
        queryClient.invalidateQueries({ queryKey: ["catalogo", tenantId] });
      }

      // 2. Guardar servicios si aplica
      if (!isPrendasMode && parseResult.servicios.length > 0) {
        for (const s of parseResult.servicios) {
          let existing = s.id ? currentServicios.find((x) => x.id === s.id) : undefined;
          if (!existing) {
            existing = currentServicios.find(
              (x) => x.nombre.toLowerCase().trim() === s.nombre.toLowerCase().trim(),
            );
          }

          const serv: Servicio = {
            id: existing?.id || s.id || uid("srv"),
            tenant_id: tenantId,
            nombre: s.nombre,
            descripcion: s.descripcion || existing?.descripcion,
            precio: s.precio,
            por_libra: s.por_libra,
            is_exento: s.is_exento,
            activo: s.activo,
            icono: existing?.icono || "🧺",
            imagen_url: existing?.imagen_url,
          };
          await saveServicio(serv);
        }
        queryClient.invalidateQueries({ queryKey: ["servicios", tenantId] });
      }

      const totalItems =
        (!isServiciosMode ? parseResult.prendas.length : 0) +
        (!isPrendasMode ? parseResult.servicios.length : 0);

      toast.success("¡Importación completada con éxito! 🎉", {
        description: `Se procesaron e importaron ${totalItems} registros.`,
        duration: 4000,
      });

      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error("Error durante la importación: " + msg);
    } finally {
      setImporting(false);
    }
  };

  const prendasNuevas =
    parseResult?.prendas.filter((p) => {
      if (p.id && currentPrendas.some((x) => x.id === p.id)) return false;
      if (
        currentPrendas.some(
          (x) =>
            x.nombre.toLowerCase().trim() === p.nombre.toLowerCase().trim() &&
            x.categoria.toLowerCase().trim() === p.categoria.toLowerCase().trim(),
        )
      )
        return false;
      return true;
    }).length || 0;
  const prendasActualizadas = (parseResult?.prendas.length || 0) - prendasNuevas;

  const serviciosNuevos =
    parseResult?.servicios.filter((s) => {
      if (s.id && currentServicios.some((x) => x.id === s.id)) return false;
      if (
        currentServicios.some(
          (x) => x.nombre.toLowerCase().trim() === s.nombre.toLowerCase().trim(),
        )
      )
        return false;
      return true;
    }).length || 0;
  const serviciosActualizados = (parseResult?.servicios.length || 0) - serviciosNuevos;

  const itemsToShow = isServiciosMode
    ? parseResult?.servicios.length || 0
    : isPrendasMode
    ? parseResult?.prendas.length || 0
    : (parseResult?.prendas.length || 0) + (parseResult?.servicios.length || 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="rounded-2xl max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-background text-foreground">
        {/* HEADER */}
        <div className="bg-primary text-white p-3 px-4.5 relative">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-black text-white leading-tight">
                {isServiciosMode
                  ? "Importar Servicios desde Excel"
                  : isPrendasMode
                  ? "Importar Prendas desde Excel"
                  : "Importar Catálogo desde Excel"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/80 mt-0.5">
                {isServiciosMode
                  ? "Carga o actualiza tus servicios y tarifas de forma masiva en segundos."
                  : isPrendasMode
                  ? "Carga o actualiza tus prendas, categorías y precios de forma masiva en segundos."
                  : "Carga o actualiza tus prendas y servicios de forma masiva en segundos."}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-3 px-4 space-y-2.5">
          {/* SI AUN NO HAY ARCHIVO */}
          {!parseResult && (
            <div className="space-y-2.5">
              {/* Botón rápido para descargar plantilla en blanco */}
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground leading-tight">
                      {isServiciosMode
                        ? "¿No tienes la plantilla de servicios?"
                        : "¿No tienes la plantilla de prendas?"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Descarga la plantilla vacía con formato Klynn, complétala y súbela.
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isServiciosMode) {
                      downloadServiciosTemplate();
                    } else {
                      downloadPrendasTemplate();
                    }
                  }}
                  className="rounded-lg h-6.5 px-2.5 text-[11px] font-bold border-primary/30 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                >
                  Descargar Plantilla
                </Button>
              </div>

              {/* Área de DropZone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/60 rounded-xl p-4 text-center transition-all bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                onClick={() => document.getElementById("excel-input-file")?.click()}
              >
                <input
                  type="file"
                  id="excel-input-file"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />

                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="h-4.5 w-4.5" />
                </div>

                <div>
                  <div className="text-xs font-bold text-foreground">
                    Arrastra tu archivo Excel aquí o{" "}
                    <span className="text-primary underline">examina tu equipo</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Formatos soportados: .xlsx, .xls o .csv (Máx. 5MB)
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary mt-0.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Procesando archivo...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA PREVIA DE RESULTADOS DE PARSEO */}
          {parseResult && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">Archivo: {file?.name}</div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300">
                      Revisa la vista previa antes de confirmar.
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={resetState}
                  className="h-7 px-3 text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs rounded-lg transition-all cursor-pointer shrink-0"
                >
                  Cambiar archivo
                </Button>
              </div>

              {/* Tarjetas de Resumen */}
              <div className={`grid ${isPrendasMode || isServiciosMode ? "grid-cols-1" : "grid-cols-2"} gap-2.5`}>
                {!isServiciosMode && (
                  <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Shirt className="h-3.5 w-3.5 text-primary" /> Prendas ({parseResult.prendas.length})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground pt-0.5 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <PlusCircle className="h-3 w-3" /> {prendasNuevas} nuevas
                      </span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <RefreshCw className="h-3 w-3" /> {prendasActualizadas} a actualizar
                      </span>
                    </div>
                  </div>
                )}

                {!isPrendasMode && (
                  <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Servicios ({parseResult.servicios.length})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground pt-0.5 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <PlusCircle className="h-3 w-3" /> {serviciosNuevos} nuevos
                      </span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <RefreshCw className="h-3 w-3" /> {serviciosActualizados} a actualizar
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Alertas de Error */}
              {parseResult.errors.length > 0 && (
                <div className="p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-0.5 max-h-24 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Se encontraron {parseResult.errors.length} advertencias:</span>
                  </div>
                  <ul className="text-[10px] list-disc list-inside space-y-0.5 opacity-90 pl-1">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabla de muestra de ítems */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-foreground">
                  Previsualización ({itemsToShow}):
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {!isServiciosMode &&
                    parseResult.prendas.map((p, idx) => {
                      const isNew =
                        (p.id ? !currentPrendas.some((x) => x.id === p.id) : true) &&
                        !currentPrendas.some(
                          (x) =>
                            x.nombre.toLowerCase().trim() === p.nombre.toLowerCase().trim() &&
                            x.categoria.toLowerCase().trim() === p.categoria.toLowerCase().trim(),
                        );
                      return (
                        <div
                          key={`p-${idx}`}
                          className="p-2 px-3 flex items-center justify-between text-xs bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{p.icono || "👕"}</span>
                            <div className="truncate">
                              <span className="font-bold">{p.nombre}</span>
                              <span className="text-muted-foreground ml-1.5 text-[10px]">
                                ({p.categoria})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-primary text-xs">
                              {formatRD(p.precio)}
                            </span>
                            {isNew ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[9px] px-1.5 py-0 font-bold">
                                NUEVA
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 font-semibold"
                              >
                                EDITAR
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {!isPrendasMode &&
                    parseResult.servicios.map((s, idx) => {
                      const isNew =
                        (s.id ? !currentServicios.some((x) => x.id === s.id) : true) &&
                        !currentServicios.some(
                          (x) => x.nombre.toLowerCase().trim() === s.nombre.toLowerCase().trim(),
                        );
                      return (
                        <div
                          key={`s-${idx}`}
                          className="p-2 px-3 flex items-center justify-between text-xs bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{s.icono || "🧺"}</span>
                            <div className="truncate">
                              <span className="font-bold">{s.nombre}</span>
                              <span className="text-muted-foreground ml-1.5 text-[10px]">
                                (Servicio)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-primary text-xs">
                              {formatRD(s.precio)}
                            </span>
                            {isNew ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[9px] px-1.5 py-0 font-bold">
                                NUEVO
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 font-semibold"
                              >
                                EDITAR
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 px-5 bg-slate-50 dark:bg-slate-900 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetState();
            }}
            className="rounded-xl h-8 px-3.5 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </Button>

          {parseResult && (
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || itemsToShow === 0}
              className="rounded-xl h-8 px-4 text-xs font-bold bg-primary text-white gap-1.5 shadow-md hover:bg-primary/90 cursor-pointer"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <span>Confirmar e Importar</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
