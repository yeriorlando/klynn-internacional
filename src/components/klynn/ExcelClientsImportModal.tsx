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
  Users,
  Building2,
  User,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import {
  parseClientsExcelFile,
  downloadClientsTemplate,
  type ExcelClientsParseResult,
  type ParsedClienteItem,
} from "@/lib/excel-clients";
import {
  saveCliente,
  uid,
  formatRD,
  formatPhoneRD,
  type Cliente,
} from "@/lib/storage";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ExcelClientsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  currentClientes: Cliente[];
  tenantName?: string;
}

export function ExcelClientsImportModal({
  open,
  onOpenChange,
  tenantId,
  currentClientes,
  tenantName = "Lavanderia",
}: ExcelClientsImportModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelClientsParseResult | null>(null);

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
      const res = await parseClientsExcelFile(selectedFile);
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

  /**
   * Encuentra si un cliente parseado ya existe en la base de datos actual.
   * Criterios: ID -> Teléfono -> Cédula/RNC -> Nombre Completo
   */
  const findExistingCliente = (p: ParsedClienteItem): Cliente | undefined => {
    // 1. Por ID exacto
    if (p.id) {
      const found = currentClientes.find((x) => x.id === p.id);
      if (found) return found;
    }

    // 2. Por Teléfono (normalizado a solo dígitos numéricos)
    const rawTel = p.telefono.replace(/\D/g, "");
    if (rawTel.length >= 7) {
      const found = currentClientes.find(
        (x) => x.telefono && x.telefono.replace(/\D/g, "") === rawTel,
      );
      if (found) return found;
    }

    // 3. Por Cédula / RNC (normalizado)
    const rawCedula = p.cedula?.replace(/\D/g, "");
    if (rawCedula && rawCedula.length >= 9) {
      const found = currentClientes.find(
        (x) => x.cedula && x.cedula.replace(/\D/g, "") === rawCedula,
      );
      if (found) return found;
    }

    // 4. Por Nombre y Apellido
    const fullNameParsed = `${p.nombre} ${p.apellido || ""}`.trim().toLowerCase();
    if (fullNameParsed) {
      const found = currentClientes.find(
        (x) => `${x.nombre} ${x.apellido || ""}`.trim().toLowerCase() === fullNameParsed,
      );
      if (found) return found;
    }

    return undefined;
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.clientes.length === 0) return;

    try {
      setImporting(true);

      for (const p of parseResult.clientes) {
        const existing = findExistingCliente(p);

        const item: Cliente = {
          id: existing?.id || p.id || uid("cli"),
          tenant_id: tenantId,
          nombre: p.nombre,
          apellido: p.apellido || existing?.apellido,
          telefono: p.telefono,
          email: p.email || existing?.email,
          cedula: p.cedula || existing?.cedula,
          direccion: p.direccion || existing?.direccion,
          sector: p.sector || existing?.sector,
          edificio_apto: p.edificio_apto || existing?.edificio_apto,
          referencia: p.referencia || existing?.referencia,
          lat: existing?.lat,
          lng: existing?.lng,
          notas: p.notas || existing?.notas,
          tipo: p.tipo || existing?.tipo || "Consumidor Final",
          limite_credito: p.limite_credito !== undefined ? p.limite_credito : (existing?.limite_credito || 0),
          creado_en: existing?.creado_en || new Date().toISOString(),
        };

        await saveCliente(item);
      }

      // Invalidar cachés de React Query
      queryClient.invalidateQueries({ queryKey: ["clientes", tenantId] });

      toast.success("¡Directorio de clientes actualizado con éxito! 🎉", {
        description: `Se procesaron e importaron ${parseResult.clientes.length} clientes.`,
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

  const clientesNuevos =
    parseResult?.clientes.filter((p) => !findExistingCliente(p)).length || 0;
  const clientesActualizados = (parseResult?.clientes.length || 0) - clientesNuevos;

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
                Importar Clientes desde Excel
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/80 mt-0.5">
                Carga o actualiza tus clientes, números de contacto y créditos de forma masiva en segundos.
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
                      ¿No tienes la plantilla de clientes?
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
                  onClick={() => downloadClientsTemplate()}
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
                onClick={() => document.getElementById("excel-clients-input-file")?.click()}
              >
                <input
                  type="file"
                  id="excel-clients-input-file"
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
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Procesando clientes...
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
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-primary" /> Clientes ({parseResult.clientes.length})
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-0.5 flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <PlusCircle className="h-3 w-3" /> {clientesNuevos} nuevos
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <RefreshCw className="h-3 w-3" /> {clientesActualizados} a actualizar
                    </span>
                  </div>
                </div>

                <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-primary" /> Tipos
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-0.5 flex flex-col gap-0.5">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {parseResult.clientes.filter((c) => c.tipo === "Empresa").length} Empresas
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {parseResult.clientes.filter((c) => c.tipo !== "Empresa").length} Consumidores
                    </span>
                  </div>
                </div>
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

              {/* Tabla de muestra de clientes */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-foreground">
                  Previsualización de clientes ({parseResult.clientes.length}):
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {parseResult.clientes.map((c, idx) => {
                    const existing = findExistingCliente(c);
                    const isNew = !existing;
                    const isEmpresa = c.tipo === "Empresa";

                    return (
                      <div
                        key={`cli-${idx}`}
                        className="p-2 px-3 flex items-center justify-between text-xs bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{isEmpresa ? "🏢" : "👤"}</span>
                          <div className="truncate">
                            <span className="font-bold">{c.nombre} {c.apellido || ""}</span>
                            <span className="text-muted-foreground ml-1.5 text-[10px]">
                              ({formatPhoneRD(c.telefono) || c.telefono})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {c.limite_credito > 0 && (
                            <span className="font-black text-primary text-xs">
                              {formatRD(c.limite_credito)}
                            </span>
                          )}
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
              disabled={importing || parseResult.clientes.length === 0}
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
