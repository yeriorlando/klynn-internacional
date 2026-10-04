import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2, ShieldCheck, CheckCircle2, AlertCircle, FileText,
  Search, ExternalLink, Download, RefreshCw, Key, Landmark, Eye,
  Copy, PlusCircle, Check, Loader2, ArrowUpRight, Percent, Receipt,
  Sparkles, Hash, ArrowDownLeft, Store, Settings, Server, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import type { Tenant, Orden, Cliente } from "@/lib/storage";
import { saveOrden } from "@/lib/storage";
import { emitirNotaCreditoSRI, emitirNotaDebitoSRI } from "@/lib/fiscal/sri-orden";

interface CentroFiscalEcuadorProps {
  tenant: Tenant;
  user: any;
  ordenes: Orden[];
  clientes: Cliente[];
}

type SubViewEcuador = "hub" | "facturas" | "notas-credito" | "notas-debito" | "puntos-emision" | "catalogos";

export function CentroFiscalEcuador({
  tenant,
  user,
  ordenes = [],
  clientes = [],
}: CentroFiscalEcuadorProps) {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<SubViewEcuador>("hub");
  const sri = tenant.config?.sri_config;
  const isSRIActive = Boolean(sri?.activo);
  const ambiente = sri?.ambiente === "2" ? "2" : "1";
  const [search, setSearch] = useState("");

  // Modales de Notas de Crédito / Débito
  const [ncModalOpen, setNcModalOpen] = useState(false);
  const [ndModalOpen, setNdModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Orden | null>(null);
  const [ncMotivo, setNcMotivo] = useState("");
  const [ncMonto, setNcMonto] = useState<string>("");
  const [ncAnulacionTotal, setNcAnulacionTotal] = useState(true);
  const [isSubmittingNC, setIsSubmittingNC] = useState(false);

  const [ndMotivo, setNdMotivo] = useState("");
  const [ndMonto, setNdMonto] = useState<string>("");
  const [isSubmittingND, setIsSubmittingND] = useState(false);

  // Lista de facturas SRI emitidas
  const facturasSRI = useMemo(() => {
    return ordenes
      .filter((o) => o.sri_clave_acceso || (o.sri_estado && o.sri_estado === "AUTORIZADO"))
      .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }, [ordenes]);

  // Métricas
  const totalFacturadoUSD = useMemo(() => {
    return facturasSRI.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [facturasSRI]);

  const totalIvaUSD = useMemo(() => {
    return facturasSRI.reduce((sum, o) => sum + (Number(o.itbis) || 0), 0);
  }, [facturasSRI]);

  // Filtrado de facturas
  const filteredFacturas = useMemo(() => {
    if (!search.trim()) return facturasSRI;
    const q = search.toLowerCase();
    return facturasSRI.filter((o) => {
      const cli = clientes.find((c) => c.id === o.cliente_id);
      return (
        (o.numero && o.numero.toLowerCase().includes(q)) ||
        (o.sri_secuencial && o.sri_secuencial.toLowerCase().includes(q)) ||
        (o.sri_clave_acceso && o.sri_clave_acceso.includes(q)) ||
        (cli?.nombre && cli.nombre.toLowerCase().includes(q)) ||
        (cli?.rnc && cli.rnc.includes(q))
      );
    });
  }, [facturasSRI, search, clientes]);

  // Manejador: Emitir Nota de Crédito SRI
  async function handleEmitirNC() {
    if (!selectedFactura) return;
    if (!ncMotivo.trim()) {
      toast.error("Por favor ingresa el motivo oficial de la Nota de Crédito.");
      return;
    }

    const cliente = clientes.find((c) => c.id === selectedFactura.cliente_id) || {
      id: "cli_gen",
      nombre: "CONSUMIDOR FINAL",
      rnc: "9999999999999",
      telefono: "",
    } as Cliente;

    const montoVal = ncAnulacionTotal ? Number(selectedFactura.total) : parseFloat(ncMonto);
    if (!montoVal || montoVal <= 0 || montoVal > Number(selectedFactura.total)) {
      toast.error("Monto de devolución o anulación inválido.");
      return;
    }

    setIsSubmittingNC(true);
    try {
      const res = await emitirNotaCreditoSRI({
        orden: selectedFactura,
        cliente,
        tenant,
        motivo: ncMotivo.trim(),
        montoDevolucion: montoVal,
      });

      if (res.success) {
        toast.success(`¡Nota de Crédito AUTORIZADA por el SRI! Clave: ${res.claveAcceso?.substring(0, 10)}...`);
        // Actualizar orden
        const updatedOrd: Orden = {
          ...selectedFactura,
          nota_credito_ncf: res.claveAcceso,
          nota_credito_monto: montoVal,
          motivo_anulacion: ncMotivo.trim(),
        };
        await saveOrden(updatedOrd);
        setNcModalOpen(false);
        setSelectedFactura(null);
        setNcMotivo("");
        setNcMonto("");
      } else {
        toast.error("Aviso del SRI: " + (res.error || "No autorizada"));
      }
    } catch (err: any) {
      toast.error("Error al emitir Nota de Crédito: " + (err.message || "desconocido"));
    } finally {
      setIsSubmittingNC(false);
    }
  }

  // Manejador: Emitir Nota de Débito SRI
  async function handleEmitirND() {
    if (!selectedFactura) return;
    if (!ndMotivo.trim()) {
      toast.error("Por favor ingresa la razón/motivo del débito.");
      return;
    }
    const montoVal = parseFloat(ndMonto);
    if (!montoVal || montoVal <= 0) {
      toast.error("Ingresa un monto adicional válido.");
      return;
    }

    const cliente = clientes.find((c) => c.id === selectedFactura.cliente_id) || {
      id: "cli_gen",
      nombre: "CONSUMIDOR FINAL",
      rnc: "9999999999999",
      telefono: "",
    } as Cliente;

    setIsSubmittingND(true);
    try {
      const res = await emitirNotaDebitoSRI({
        orden: selectedFactura,
        cliente,
        tenant,
        motivo: ndMotivo.trim(),
        montoAdicional: montoVal,
      });

      if (res.success) {
        toast.success(`¡Nota de Débito AUTORIZADA por el SRI! Clave: ${res.claveAcceso?.substring(0, 10)}...`);
        const updatedOrd: Orden = {
          ...selectedFactura,
          nota_debito_ncf: res.claveAcceso,
          nota_debito_monto: montoVal,
        };
        await saveOrden(updatedOrd);
        setNdModalOpen(false);
        setSelectedFactura(null);
        setNdMotivo("");
        setNdMonto("");
      } else {
        toast.error("Aviso del SRI: " + (res.error || "No autorizada"));
      }
    } catch (err: any) {
      toast.error("Error al emitir Nota de Débito: " + (err.message || "desconocido"));
    } finally {
      setIsSubmittingND(false);
    }
  }

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300 font-sans"
      style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* 1. Header Oficial de Facturación SRI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white shadow-xs">
            <img
              src="https://flagcdn.com/w80/ec.png"
              alt="Ecuador"
              className="h-full w-full object-cover scale-110 rounded-2xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-black text-foreground tracking-tight">
                Centro de Facturación Electrónica SRI (Ecuador)
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              RUC: <strong>{sri?.ruc || tenant.rnc || "No configurado"}</strong> · Razón Social: <strong>{sri?.razon_social || tenant.nombre}</strong> · Establecimiento: <strong>{sri?.establecimiento || "001"}-{sri?.punto_emision || "001"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
            isSRIActive
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          }`}>
            <span className={`h-2 w-2 rounded-full ${isSRIActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {isSRIActive ? (ambiente === "2" ? "SRI Producción Activo" : "SRI Pruebas Sandbox") : "SRI Desactivado"}
          </span>

          <Link
            to="/t/$slug/configuracion"
            params={{ slug: tenant.slug }}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#1B4B73] hover:bg-[#163e5f] text-white shadow-xs transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Configuración Fiscal</span>
          </Link>
        </div>
      </div>

      {/* 2. Barra de Navegación de Sub-vistas */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setCurrentView("hub")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "hub"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Resumen & Hub SRI
        </button>
        <button
          onClick={() => setCurrentView("facturas")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "facturas"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Facturas Emitidas ({facturasSRI.length})
        </button>
        <button
          onClick={() => setCurrentView("notas-credito")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "notas-credito"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Notas de Crédito (04)
        </button>
        <button
          onClick={() => setCurrentView("notas-debito")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "notas-debito"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Notas de Débito (05)
        </button>
        <button
          onClick={() => setCurrentView("puntos-emision")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "puntos-emision"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Puntos de Emisión
        </button>
        <button
          onClick={() => setCurrentView("catalogos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentView === "catalogos"
              ? "bg-white dark:bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Catálogos Oficiales SRI
        </button>
      </div>

      {/* 3. SUB-VISTA: HUB / RESUMEN */}
      {currentView === "hub" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl border shadow-xs space-y-1">
              <span className="text-xs font-bold text-muted-foreground">Total Facturado SRI</span>
              <div className="text-2xl font-black text-foreground tabular-nums">
                ${totalFacturadoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-600 font-bold block">USD (Dólares)</span>
            </Card>

            <Card className="p-5 rounded-2xl border shadow-xs space-y-1">
              <span className="text-xs font-bold text-muted-foreground">IVA 15% Recaudado</span>
              <div className="text-2xl font-black text-foreground tabular-nums">
                ${totalIvaUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-muted-foreground block">Tarifa oficial vigente</span>
            </Card>

            <Card className="p-5 rounded-2xl border shadow-xs space-y-1">
              <span className="text-xs font-bold text-muted-foreground">Facturas Emitidas</span>
              <div className="text-2xl font-black text-foreground tabular-nums">{facturasSRI.length}</div>
              <span className="text-[11px] text-blue-600 font-bold block">Tipo 01 · Factura</span>
            </Card>

            <Card className="p-5 rounded-2xl border shadow-xs space-y-1">
              <span className="text-xs font-bold text-muted-foreground">Estado de Firma Digital</span>
              <div className="text-base font-bold text-foreground flex items-center gap-1.5 pt-1">
                {sri?.certificado_cargado ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Certificado Activo
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Pendiente .p12
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground block">
                {sri?.certificado_nombre || "Subir en Configuración"}
              </span>
            </Card>
          </div>

          {/* Últimos comprobantes autorizados */}
          <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Comprobantes Recientes Autorizados</h3>
                <p className="text-xs text-muted-foreground">Facturas y documentos con autorización oficial del SRI.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView("facturas")}
                className="text-xs font-bold rounded-xl"
              >
                Ver todas las facturas
              </Button>
            </div>

            {facturasSRI.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                Aún no has emitido facturas electrónicas para Ecuador. Puedes cobrar una orden en el punto de venta o realizar una prueba desde <strong>Configuración › Fiscal</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b text-muted-foreground font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left">Serie / Secuencial</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Estado SRI</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {facturasSRI.slice(0, 5).map((f) => {
                      const cli = clientes.find((c) => c.id === f.cliente_id);
                      return (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-sky-700">
                            {f.sri_secuencial || f.numero}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(f.creado_en).toLocaleDateString("es-EC")}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {cli?.nombre || "Consumidor Final"}
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {cli?.rnc || cli?.cedula || "9999999999999"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            ${f.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                              AUTORIZADO
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {f.sri_ride_url && (
                              <a
                                href={f.sri_ride_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" /> RIDE PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 4. SUB-VISTA: FACTURAS EMITIDAS */}
      {currentView === "facturas" && (
        <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Registro de Facturas Electrónicas (Tipo 01)</h3>
              <p className="text-xs text-muted-foreground">Comprobantes tributarios emitidos con Clave de Acceso oficial.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUC, serie o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b text-muted-foreground font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Serie Oficial</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Cliente / RUC</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">IVA (15%)</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Clave de Acceso (49 dígitos)</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredFacturas.map((f) => {
                  const cli = clientes.find((c) => c.id === f.cliente_id);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-sky-700">
                        {f.sri_secuencial || f.numero}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(f.creado_en).toLocaleDateString("es-EC")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {cli?.nombre || "CONSUMIDOR FINAL"}
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {cli?.rnc || cli?.cedula || "9999999999999"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${(f.subtotal || f.total / 1.15).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">${(f.itbis || f.total - f.total / 1.15).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">${f.total.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] max-w-[200px] truncate" title={f.sri_clave_acceso}>
                        {f.sri_clave_acceso ? (
                          <div className="flex items-center gap-1">
                            <span className="truncate">{f.sri_clave_acceso}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(f.sri_clave_acceso || "");
                                toast.success("Clave de acceso copiada");
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Copiar clave"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {f.sri_ride_url && (
                            <a
                              href={f.sri_ride_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px] inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> RIDE
                            </a>
                          )}
                          {f.sri_xml_url && (
                            <a
                              href={f.sri_xml_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[10px] inline-flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" /> XML
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFactura(f);
                              setNcMonto(f.total.toFixed(2));
                              setNcModalOpen(true);
                            }}
                            className="h-6 px-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                          >
                            Nota Crédito
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFactura(f);
                              setNdMonto("0.00");
                              setNdModalOpen(true);
                            }}
                            className="h-6 px-2 text-[10px] font-bold text-amber-700 hover:bg-amber-50"
                          >
                            Nota Débito
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFacturas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No se encontraron facturas coincidentes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. SUB-VISTA: NOTAS DE CRÉDITO (04) */}
      {currentView === "notas-credito" && (
        <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Notas de Crédito Electrónicas (Tipo 04)</h3>
              <p className="text-xs text-muted-foreground">Comprobantes para anulación total, devolución de prendas o descuentos comerciales.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
            <span className="font-bold">Normativa SRI Ecuador: </span>
            La Nota de Crédito modifica una factura previa autorizada. Debes indicar el motivo legal y los valores antes de IVA. El SRI la autoriza y genera su propio RIDE PDF.
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b text-muted-foreground font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Factura Modificada</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Motivo de Nota de Crédito</th>
                  <th className="px-4 py-3 text-right">Monto Anulado / Devuelto</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {facturasSRI
                  .filter((f) => f.nota_credito_ncf)
                  .map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">
                        {f.sri_secuencial || f.numero}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(f.creado_en).toLocaleDateString("es-EC")}
                      </td>
                      <td className="px-4 py-3 font-medium">{f.motivo_anulacion || "Anulación de servicios"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                        -${(f.nota_credito_monto || f.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                          NC AUTORIZADA
                        </Badge>
                      </td>
                    </tr>
                  ))}
                {facturasSRI.filter((f) => f.nota_credito_ncf).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No has emitido Notas de Crédito aún. Puedes emitir una desde la pestaña <strong>Facturas Emitidas</strong> haciendo clic en "Nota Crédito".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. SUB-VISTA: NOTAS DE DÉBITO (05) */}
      {currentView === "notas-debito" && (
        <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Notas de Débito Electrónicas (Tipo 05)</h3>
            <p className="text-xs text-muted-foreground">Comprobantes para cobros o cargos adicionales imputados a una factura previa.</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            <span className="font-bold">Normativa SRI Ecuador: </span>
            La Nota de Débito se utiliza para recargos posteriores (ej. prenda con tratamiento especial no contemplado inicialmente o recargos de entrega).
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b text-muted-foreground font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Factura Modificada</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto Adicional</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {facturasSRI
                  .filter((f) => f.nota_debito_ncf)
                  .map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">
                        {f.sri_secuencial || f.numero}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(f.creado_en).toLocaleDateString("es-EC")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                        +${(f.nota_debito_monto || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          ND AUTORIZADA
                        </Badge>
                      </td>
                    </tr>
                  ))}
                {facturasSRI.filter((f) => f.nota_debito_ncf).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No has emitido Notas de Débito aún. Puedes emitir una desde la pestaña <strong>Facturas Emitidas</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 7. SUB-VISTA: PUNTOS DE EMISIÓN */}
      {currentView === "puntos-emision" && (
        <Card className="p-6 rounded-2xl border shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Estructura de Numeración y Puntos de Emisión SRI</h3>
              <p className="text-xs text-muted-foreground">Reglamento de Comprobantes de Venta, Retención y Documentos Complementarios.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">1. Establecimiento</span>
              <div className="text-xl font-mono font-black text-foreground">{sri?.establecimiento || "001"}</div>
              <p className="text-[11px] text-muted-foreground">Matriz o sucursal autorizada por el SRI.</p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">2. Punto de Emisión</span>
              <div className="text-xl font-mono font-black text-foreground">{sri?.punto_emision || "001"}</div>
              <p className="text-[11px] text-muted-foreground">Caja o terminal de facturación en el local.</p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">3. Secuencial Continuo</span>
              <div className="text-xl font-mono font-black text-emerald-600">000000001 ... 999999999</div>
              <p className="text-[11px] text-muted-foreground">Numeración correlativa automática de 9 dígitos.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200 space-y-2">
            <div className="font-bold">A diferencia de otros países:</div>
            <p>
              En el SRI Ecuador <strong>no necesitas solicitar lotes con fechas de caducidad</strong>. Cada negocio es dueño de su correlativo y simplemente incrementa la secuencia en cada comprobante emitido.
            </p>
          </div>
        </Card>
      )}

      {/* 8. SUB-VISTA: CATÁLOGOS SRI */}
      {currentView === "catalogos" && (
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground">Catálogo de Tipos de Identificación SRI</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 04 — RUC:</strong> 13 dígitos numéricos terminados en 001. Para personas naturales o jurídicas con actividad comercial.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 05 — Cédula:</strong> 10 dígitos numéricos. Para personas naturales ecuatorianas o residentes.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 06 — Pasaporte:</strong> Hasta 20 caracteres para clientes extranjeros sin cédula.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 07 — Consumidor Final:</strong> Identificación <code>9999999999999</code> para montos que no requieren datos fiscales.
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground">Catálogo de Formas de Pago SRI</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 01 — Sin utilización del sistema financiero:</strong> Efectivo en caja.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 16 — Tarjeta de Débito:</strong> Pagos electrónicos mediante terminal bancario de débito.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 19 — Tarjeta de Crédito:</strong> Cobros diferidos o corrientes con tarjeta de crédito.
              </div>
              <div className="p-3 rounded-xl border bg-slate-50/50 text-xs">
                <strong>Código 20 — Otros con sistema financiero:</strong> Transferencias bancarias directas, depósitos y cheques.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: EMITIR NOTA DE CRÉDITO */}
      <Dialog open={ncModalOpen} onOpenChange={setNcModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Emitir Nota de Crédito SRI (04)</DialogTitle>
            <DialogDescription className="text-xs">
              Modifica la factura <strong>{selectedFactura?.sri_secuencial || selectedFactura?.numero}</strong> por un monto total de ${selectedFactura?.total.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold block mb-1">Motivo Oficial SRI *</Label>
              <Input
                placeholder="Ej: Devolución total por daño de prenda / Descuento"
                value={ncMotivo}
                onChange={(e) => setNcMotivo(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 text-xs">
              <span>¿Anulación Total de la Factura?</span>
              <input
                type="checkbox"
                checked={ncAnulacionTotal}
                onChange={(e) => {
                  setNcAnulacionTotal(e.target.checked);
                  if (e.target.checked && selectedFactura) {
                    setNcMonto(selectedFactura.total.toFixed(2));
                  }
                }}
                className="h-4 w-4 rounded text-primary cursor-pointer"
              />
            </div>

            {!ncAnulacionTotal && (
              <div>
                <Label className="text-xs font-bold block mb-1">Monto Parcial a Devolver ($ USD con IVA)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ncMonto}
                  onChange={(e) => setNcMonto(e.target.value)}
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setNcModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleEmitirNC}
              disabled={isSubmittingNC}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              {isSubmittingNC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Emitir Nota de Crédito</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EMITIR NOTA DE DÉBITO */}
      <Dialog open={ndModalOpen} onOpenChange={setNdModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Emitir Nota de Débito SRI (05)</DialogTitle>
            <DialogDescription className="text-xs">
              Añade un cargo adicional a la factura <strong>{selectedFactura?.sri_secuencial || selectedFactura?.numero}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold block mb-1">Razón / Motivo del Débito *</Label>
              <Input
                placeholder="Ej: Cargo adicional por servicio express no cobrado"
                value={ndMotivo}
                onChange={(e) => setNdMotivo(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold block mb-1">Monto Adicional Total ($ USD con IVA)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={ndMonto}
                onChange={(e) => setNdMonto(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setNdModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleEmitirND}
              disabled={isSubmittingND}
              className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmittingND ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Emitir Nota de Débito</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
