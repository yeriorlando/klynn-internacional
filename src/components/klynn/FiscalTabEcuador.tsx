import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2, ShieldCheck, CheckCircle2, AlertCircle, Upload, Key,
  Save, Loader2, RefreshCw, FileText, Globe, Check, Eye, EyeOff,
  Percent, Receipt, Server, Landmark, BadgePercent, MapPin, Hash, Sparkles,
  X, ExternalLink, FlaskConical, Download, Store
} from "lucide-react";
import { saveTenant, type Tenant, type TenantConfig, type SRIConfig, DEFAULT_CONFIG } from "@/lib/storage";
import { getSRIClient } from "@/lib/fiscal/sri-client";
import { SRI_DEFAULT_API_URL } from "@/lib/fiscal/sri-constants";
import { emitirFacturaSRIPrueba } from "@/lib/fiscal/sri-orden";

interface FiscalTabEcuadorProps {
  tenant: Tenant;
  onRefresh?: () => void;
  onTenantUpdate?: (t: Tenant) => void;
}

const FIELD = "h-11 rounded-xl border-input bg-background text-sm font-sans focus-visible:ring-1 focus-visible:ring-ring transition-all px-4";
const CARD = "border shadow-xs p-6 md:p-8 rounded-2xl";

export function FiscalTabEcuador({
  tenant,
  onRefresh,
  onTenantUpdate,
}: FiscalTabEcuadorProps) {
  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;
  const sri: Partial<SRIConfig> = cfg.sri_config || {};

  // 1. Datos del Emisor (Prellenados del registro si están vacíos)
  const [ruc, setRuc] = useState<string>(sri.ruc || tenant.rnc || "");
  const [razonSocial, setRazonSocial] = useState<string>(sri.razon_social || tenant.razon_social || tenant.nombre || "");
  const [nombreComercial, setNombreComercial] = useState<string>(sri.nombre_comercial || tenant.nombre || "");
  const [dirMatriz, setDirMatriz] = useState<string>(sri.direccion_matriz || tenant.direccion || tenant.provincia || "Ecuador");
  const [dirEstablecimiento, setDirEstablecimiento] = useState<string>(sri.direccion_establecimiento || tenant.direccion || tenant.provincia || "Ecuador");

  // 2. Parámetros Tributarios SRI
  const [ambiente, setAmbiente] = useState<"1" | "2">(sri.ambiente || "1");
  const [establecimiento, setEstablecimiento] = useState<string>(sri.establecimiento || "001");
  const [puntoEmision, setPuntoEmision] = useState<string>(sri.punto_emision || "001");
  const [obligadoContabilidad, setObligadoContabilidad] = useState<boolean>(Boolean(sri.obligado_contabilidad));
  const [contribuyenteRimpe, setContribuyenteRimpe] = useState<boolean>(
    sri.contribuyente_rimpe !== undefined ? Boolean(sri.contribuyente_rimpe) : true
  );
  const [activoSRI, setActivoSRI] = useState<boolean>(
    sri.activo !== undefined ? Boolean(sri.activo) : true
  );

  // 3. Impuesto IVA 15%
  const [cobrarIVA, setCobrarIVA] = useState<boolean>(cfg.cobrar_impuesto !== false);
  const [ivaIncluido, setIvaIncluido] = useState<boolean>(cfg.itbis_incluido !== false);
  const [mostrarColumnaIVA, setMostrarColumnaIVA] = useState<boolean>(cfg.mostrar_columna_itbis ?? true);

  // 4. Certificado Digital .p12
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [certLoaded, setCertLoaded] = useState<boolean>(Boolean(sri.certificado_cargado));
  const [certFileName, setCertFileName] = useState<string>(sri.certificado_nombre || "");
  const [uploadingCert, setUploadingCert] = useState<boolean>(false);

  // 5. Estado general de guardado, simulación y prueba de API
  const [saving, setSaving] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<"verificando" | "online" | "offline">("verificando");
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testingInvoice, setTestingInvoice] = useState<boolean>(false);
  const [testInvoiceResult, setTestInvoiceResult] = useState<any>(null);

  // Probar conectividad con API SRI al montar
  useEffect(() => {
    checkApiHealth();
  }, []);

  async function checkApiHealth() {
    try {
      const res = await fetch(`${SRI_DEFAULT_API_URL}/status`, { method: "GET" });
      if (res.ok) {
        setApiStatus("online");
      } else {
        setApiStatus("offline");
      }
    } catch {
      try {
        await fetch(`${SRI_DEFAULT_API_URL}/api`, { method: "HEAD", mode: "no-cors" });
        setApiStatus("online");
      } catch {
        setApiStatus("offline");
      }
    }
  }

  // Subida de Certificado de Firma Electrónica .p12
  async function handleUploadCertificate() {
    if (!certFile) {
      toast.error("Por favor selecciona un archivo de firma digital (.p12 o .pfx).");
      return;
    }
    if (!certPassword.trim()) {
      toast.error("Ingresa la contraseña de tu archivo de firma electrónica.");
      return;
    }

    setUploadingCert(true);
    try {
      const client = getSRIClient();
      await client.uploadCertificate(certFile, certPassword);

      setCertLoaded(true);
      setCertFileName(certFile.name);

      // Guardar de inmediato el estado en tenant
      const updatedSriConfig: SRIConfig = {
        ruc: ruc.trim(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim(),
        direccion_matriz: dirMatriz.trim(),
        direccion_establecimiento: dirEstablecimiento.trim(),
        ambiente,
        establecimiento,
        punto_emision: puntoEmision,
        obligado_contabilidad: obligadoContabilidad,
        contribuyente_rimpe: contribuyenteRimpe,
        certificado_cargado: true,
        certificado_nombre: certFile.name,
        activo: activoSRI,
      };

      const updatedTenant: Tenant = {
        ...tenant,
        config: {
          ...cfg,
          sri_config: updatedSriConfig,
        },
      };

      await saveTenant(updatedTenant);
      onTenantUpdate?.(updatedTenant);

      toast.success("¡Certificado digital (.p12) cargado y registrado exitosamente en el SRI!");
      setCertPassword("");
      setCertFile(null);
    } catch (err: any) {
      toast.error("Error al subir el certificado: " + (err.message || "Verifique la contraseña o el archivo"));
    } finally {
      setUploadingCert(false);
    }
  }

  // Guardar configuración y registrar Emisor en el Microservicio SRI
  async function handleSaveAndSyncSRI() {
    if (!ruc.trim() || ruc.trim().length !== 13) {
      toast.error("El RUC de Ecuador debe contener exactamente 13 dígitos numéricos.");
      return;
    }
    if (!razonSocial.trim()) {
      toast.error("La Razón Social o Nombre Legal es requerida.");
      return;
    }

    setSaving(true);
    try {
      const updatedSriConfig: SRIConfig = {
        ruc: ruc.trim(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || razonSocial.trim(),
        direccion_matriz: dirMatriz.trim() || "Ecuador",
        direccion_establecimiento: dirEstablecimiento.trim() || dirMatriz.trim() || "Ecuador",
        ambiente,
        establecimiento: establecimiento.trim() || "001",
        punto_emision: puntoEmision.trim() || "001",
        obligado_contabilidad: obligadoContabilidad,
        contribuyente_rimpe: contribuyenteRimpe,
        certificado_cargado: certLoaded,
        certificado_nombre: certFileName || undefined,
        activo: activoSRI,
      };

      const updatedTenant: Tenant = {
        ...tenant,
        rnc: ruc.trim(),
        razon_social: razonSocial.trim(),
        direccion: dirMatriz.trim() || tenant.direccion,
        impuesto_nombre: "IVA",
        impuesto_porcentaje: cobrarIVA ? 15 : 0,
        documento_fiscal_label: "RUC",
        config: {
          ...cfg,
          cobrar_impuesto: cobrarIVA,
          itbis_porcentaje: cobrarIVA ? 15 : 0,
          itbis_incluido: ivaIncluido,
          mostrar_columna_itbis: mostrarColumnaIVA,
          razon_social: razonSocial.trim(),
          sri_config: updatedSriConfig,
        },
      };

      // 1. Guardar en Base de Datos de Klynn
      await saveTenant(updatedTenant);
      onTenantUpdate?.(updatedTenant);

      // 2. Sincronizar Emisor y Punto de Emisión en el Servidor SRI
      const client = getSRIClient();
      try {
        await client.saveEmisor({
          ruc: ruc.trim(),
          razonSocial: razonSocial.trim(),
          nombreComercial: nombreComercial.trim() || razonSocial.trim(),
          direccionMatriz: dirMatriz.trim() || "Ecuador",
          obligadoContabilidad,
          contribuyenteRimpe,
          ambiente,
          tenantId: tenant.id,
        });

        await client.savePuntoEmision({
          establecimiento: establecimiento.trim() || "001",
          puntoEmision: puntoEmision.trim() || "001",
          direccionEstablecimiento: dirEstablecimiento.trim() || dirMatriz.trim() || "Ecuador",
          descripcion: `Caja Principal - ${tenant.nombre}`,
        });

        toast.success("¡Configuración fiscal y datos de emisor sincronizados con el SRI Ecuador!");
      } catch (sriSyncErr: any) {
        console.warn("[SRI Sync Error]", sriSyncErr);
        toast.info("Ajustes guardados localmente. " + (sriSyncErr.message || "Asegúrate de haber cargado el certificado digital .p12."));
      }

      onRefresh?.();
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message || "desconocido"));
    } finally {
      setSaving(false);
    }
  }

  // Prueba de Conexión en vivo
  async function handleTestConnection() {
    setTestingConnection(true);
    setApiStatus("verificando");
    try {
      const res = await fetch(`${SRI_DEFAULT_API_URL}/status`, { method: "GET" });
      if (res.ok) {
        setApiStatus("online");
        toast.success("¡Servicio SRI verificado exitosamente! Conexión en línea y lista.");
      } else {
        const client = getSRIClient();
        await client.getAuthToken();
        setApiStatus("online");
        toast.success("¡Conexión exitosa con el servicio de Facturación SRI!");
      }
    } catch {
      try {
        const client = getSRIClient();
        await client.getAuthToken();
        setApiStatus("online");
        toast.success("¡Conexión exitosa con el servicio de Facturación SRI!");
      } catch {
        setApiStatus("offline");
        toast.error("El servicio SRI no responde o se encuentra fuera de línea.");
      }
    } finally {
      setTestingConnection(false);
    }
  }

  // Emisión de Factura de Prueba (Simulador SRI)
  async function handleEmitirFacturaPrueba() {
    if (!ruc.trim() || ruc.trim().length !== 13) {
      toast.error("Por favor completa y guarda tu RUC (13 dígitos) antes de realizar una prueba.");
      return;
    }
    setTestingInvoice(true);
    setTestInvoiceResult(null);
    try {
      const res = await emitirFacturaSRIPrueba(tenant);
      if (res.success) {
        setTestInvoiceResult(res);
        toast.success("¡Factura de prueba autorizada exitosamente por el SRI!");
      } else {
        toast.error("Respuesta del SRI: " + (res.error || "No autorizada"));
        setTestInvoiceResult(res);
      }
    } catch (err: any) {
      toast.error("Error al emitir factura de prueba: " + (err.message || "Verifique certificado y RUC"));
    } finally {
      setTestingInvoice(false);
    }
  }

  return (
    <div
      className="space-y-6 animate-in fade-in duration-300 font-sans"
      style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* 1. Banner Principal de Facturación SRI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-white shadow-xs">
            <img
              src="https://flagcdn.com/w80/ec.png"
              alt="Ecuador"
              className="h-full w-full object-cover scale-110 rounded-full"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-display font-black text-foreground tracking-tight">
                Facturación Electrónica SRI (Ecuador)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Emisión oficial de facturas con firma digital <strong>.p12</strong>, RIDE y autorización directa del SRI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Indicador de Estado SRI */}
          {apiStatus === "online" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Estado SRI: En Línea</span>
            </span>
          )}
          {apiStatus === "offline" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Estado SRI: Fuera de Línea</span>
            </span>
          )}
          {apiStatus === "verificando" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Estado SRI: Verificando...</span>
            </span>
          )}

          {/* Botón Verificar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="h-8 px-3 rounded-full text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-sky-600 dark:text-sky-400 ${testingConnection ? "animate-spin" : ""}`} />
            <span>{testingConnection ? "Verificando..." : "Verificar"}</span>
          </Button>

          {/* Badge Ambiente SRI */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
            activoSRI
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
          }`}>
            <span className={`h-2 w-2 rounded-full ${activoSRI ? "bg-emerald-500" : "bg-slate-400"}`} />
            {activoSRI ? (ambiente === "2" ? "SRI Producción" : "SRI Pruebas") : "SRI Desactivado"}
          </span>
        </div>
      </div>

      {/* 2. Interruptor Maestro de Emisión SRI */}
      <Card className={`${CARD} border-blue-200/80 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/10 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Habilitar Facturación Electrónica SRI</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Al activar esta opción, las órdenes emitidas desde el punto de venta generarán factura electrónica autorizada ante el SRI.
              </p>
            </div>
          </div>
          <Switch
            checked={activoSRI}
            onCheckedChange={setActivoSRI}
          />
        </div>
      </Card>

      {/* 3. Datos Fiscales del Contribuyente (Prellenados de Registro) */}
      <Card className={`${CARD} space-y-6`}>
        <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
          <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground leading-tight">
              Datos del Emisor Tributario (SRI)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Información del RUC registrada en el Servicio de Rentas Internas de Ecuador.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Número de RUC (13 dígitos) *
            </label>
            <div className="relative">
              <Landmark className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className={`${FIELD} pl-10 font-bold text-base tabular-nums`}
                value={ruc}
                maxLength={13}
                placeholder="1790012345001"
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Debe terminar en 001 y tener exactamente 13 números.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Razón Social (Nombre Legal SRI) *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className={`${FIELD} pl-10 font-bold`}
                value={razonSocial}
                placeholder="Ej: LAVANDERIA ECUATORIANA S.A.S."
                onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tal como figura exactamente en tu comprobante de RUC.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Nombre Comercial
            </label>
            <div className="relative">
              <Store className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className={`${FIELD} pl-10`}
                value={nombreComercial}
                placeholder="Ej: Klynn Laundry Guayaquil"
                onChange={(e) => setNombreComercial(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Dirección Matriz *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className={`${FIELD} pl-10`}
                value={dirMatriz}
                placeholder="Ej: Av. 9 de Octubre y Boyacá"
                onChange={(e) => setDirMatriz(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Dirección de Sucursal / Establecimiento
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className={`${FIELD} pl-10`}
                value={dirEstablecimiento}
                placeholder="Ej: Centro Comercial Mall del Sol Local 12"
                onChange={(e) => setDirEstablecimiento(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clasificación Tributaria SRI */}
        <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/70">
          <div
            onClick={() => setContribuyenteRimpe(!contribuyenteRimpe)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 cursor-pointer select-none"
          >
            <div>
              <span className="text-xs font-bold text-foreground block">Contribuyente Régimen RIMPE</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Negocio Popular o Emprendedor (leyenda obligatoria en RIDE).
              </p>
            </div>
            <Switch
              checked={contribuyenteRimpe}
              onCheckedChange={setContribuyenteRimpe}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div
            onClick={() => setObligadoContabilidad(!obligadoContabilidad)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 cursor-pointer select-none"
          >
            <div>
              <span className="text-xs font-bold text-foreground block">Obligado a Llevar Contabilidad</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Indica "SI" o "NO" en el XML oficial del SRI.
              </p>
            </div>
            <Switch
              checked={obligadoContabilidad}
              onCheckedChange={setObligadoContabilidad}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </Card>

      {/* 4. Certificado de Firma Electrónica (.p12 / .pfx) */}
      <Card className={`${CARD} space-y-6`}>
        <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
          <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Key className="h-5.5 w-5.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                Firma Electrónica (.p12 / .pfx)
              </h3>
              {certLoaded ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold gap-1">
                  <Check className="h-3 w-3" /> Certificado Activo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 font-bold">
                  Pendiente de Cargar
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Certificado digital en archivo emitido por el Banco Central, Security Data, Consejo de la Judicatura o entidad certificadora.
            </p>
          </div>
        </div>

        {certLoaded && certFileName && (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Archivo actual:</span> <span className="font-sans font-semibold px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">{certFileName}</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Firma cargada y lista para firmar comprobantes XML en el microservicio.</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Archivo de Firma Digital (.p12 o .pfx)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".p12,.pfx"
              className="hidden"
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 transition-all cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  certFile ? "bg-emerald-600 text-white" : "bg-[#1B4B73] text-white group-hover:bg-[#163e5f]"
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {certFile ? certFile.name : "Seleccionar certificado digital"}
                  </span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {certFile
                      ? `${(certFile.size / 1024).toFixed(1)} KB · Archivo seleccionado`
                      : "Haz clic para examinar tu archivo .p12 o .pfx"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {certFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCertFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Quitar archivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-3 rounded-lg text-xs font-bold pointer-events-none border-slate-300 dark:border-slate-700 bg-white dark:bg-card shadow-2xs gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  Examinar
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              El archivo se transfiere de forma cifrada mediante HTTPS a tu instancia SRI.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Contraseña de la Firma Digital
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={certPassword}
                placeholder="Contraseña del certificado"
                onChange={(e) => setCertPassword(e.target.value)}
                className={`${FIELD} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Clave privada otorgada al momento de descargar tu certificado.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleUploadCertificate}
            disabled={uploadingCert || !certFile}
            className="h-10 px-5 rounded-xl font-bold bg-[#1B4B73] hover:bg-[#163e5f] text-white gap-2 cursor-pointer shadow-xs"
          >
            {uploadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>Subir y Validar Certificado</span>
          </Button>
        </div>
      </Card>

      {/* 5. Punto de Emisión & Ambiente SRI */}
      <Card className={`${CARD} space-y-6`}>
        <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
          <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Hash className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground leading-tight">
              Punto de Emisión y Ambiente SRI
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define la numeración de establecimiento y caja autorizada por el SRI.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Ambiente SRI
            </label>
            <Select value={ambiente} onValueChange={(val: "1" | "2") => setAmbiente(val)}>
              <SelectTrigger className="h-11 rounded-xl font-bold text-xs bg-background">
                <div className="flex items-center gap-2 truncate">
                  {ambiente === "1" ? (
                    <FlaskConical className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="1"
                  icon={<FlaskConical className="h-4 w-4 text-amber-500 shrink-0" />}
                >
                  1 — Pruebas (Sandbox)
                </SelectItem>
                <SelectItem
                  value="2"
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                >
                  2 — Producción Oficial
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pruebas permite emitir sin valor tributario para verificar que todo funcione.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Establecimiento (3 dígitos)
            </label>
            <Input
              className={`${FIELD} font-bold text-center text-base tabular-nums`}
              maxLength={3}
              value={establecimiento}
              onChange={(e) => setEstablecimiento(e.target.value.replace(/\D/g, "").padStart(3, "0").slice(-3))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Generalmente <strong>001</strong> para la matriz o sucursal principal.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Punto de Emisión (3 dígitos)
            </label>
            <Input
              className={`${FIELD} font-bold text-center text-base tabular-nums`}
              maxLength={3}
              value={puntoEmision}
              onChange={(e) => setPuntoEmision(e.target.value.replace(/\D/g, "").padStart(3, "0").slice(-3))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Generalmente <strong>001</strong> para la caja registradora.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20 p-4 text-xs text-sky-900 dark:text-sky-300">
          <span className="font-bold">Formato de tus Comprobantes: </span>
          Las facturas generadas tendrán la numeración oficial SRI:{" "}
          <strong className="font-bold bg-sky-100 dark:bg-sky-900/60 px-1.5 py-0.5 rounded tabular-nums">
            {establecimiento}-{puntoEmision}-000000001
          </strong>
        </div>
      </Card>

      {/* 6. Configuración de IVA (15% Ecuador) */}
      <Card className={`${CARD} space-y-6`}>
        <div className="flex items-center gap-3.5 pb-5 border-b border-border/70">
          <div className="h-11 w-11 rounded-xl bg-[#1B4B73] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Percent className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground leading-tight">
              Configuración de Impuesto (IVA 15%)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tarifa vigente en la República del Ecuador para servicios de lavandería y tintorería.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div
            onClick={() => setCobrarIVA(!cobrarIVA)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 cursor-pointer select-none"
          >
            <div>
              <span className="text-xs font-bold text-foreground block">Cobrar IVA (15%)</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Aplica tarifa 15% en ventas.</p>
            </div>
            <Switch
              checked={cobrarIVA}
              onCheckedChange={setCobrarIVA}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div
            onClick={() => setIvaIncluido(!ivaIncluido)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 cursor-pointer select-none"
          >
            <div>
              <span className="text-xs font-bold text-foreground block">Precios incluyen IVA</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Desglosa el 15% del precio total.</p>
            </div>
            <Switch
              checked={ivaIncluido}
              onCheckedChange={setIvaIncluido}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div
            onClick={() => setMostrarColumnaIVA(!mostrarColumnaIVA)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 cursor-pointer select-none"
          >
            <div>
              <span className="text-xs font-bold text-foreground block">Columna en Ticket</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Imprime desglose en papel térmico.</p>
            </div>
            <Switch
              checked={mostrarColumnaIVA}
              onCheckedChange={setMostrarColumnaIVA}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </Card>

      {/* 7. Simulador y Prueba de Emisión en Ambiente SRI */}
      <Card className={`${CARD} border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 space-y-5`}>
        <div className="flex items-center gap-3.5 pb-4 border-b border-border/70">
          <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FlaskConical className="h-5.5 w-5.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <h3 className="font-display font-bold text-lg text-foreground leading-tight">
                Simulador de Emisión SRI (Factura de Prueba)
              </h3>
              <Badge variant="outline" className="text-amber-700 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 font-bold">
                Ambiente 1 · Pruebas Sandbox
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prueba la generación de XML, firma digital y autorización ante el WebService del SRI sin valor tributario.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-white/60 dark:bg-slate-950/40">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground block">¿Cómo probar tu integración?</span>
            1. Asegúrate de tener tu RUC (13 dígitos) y Razón Social guardados.<br />
            2. Sube tu archivo <code>.p12</code> con su contraseña.<br />
            3. Haz clic en <strong>Emitir Factura de Prueba</strong> para recibir la Clave de Acceso y autorización en vivo.
          </div>

          <Button
            onClick={handleEmitirFacturaPrueba}
            disabled={testingInvoice || !certLoaded}
            className="h-10 px-5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs cursor-pointer gap-2"
          >
            {testingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            <span>Emitir Factura de Prueba</span>
          </Button>
        </div>

        {testInvoiceResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
            testInvoiceResult.success
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {testInvoiceResult.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>¡Factura de Prueba AUTORIZADA por el SRI!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>Respuesta del SRI: {testInvoiceResult.error || "No autorizada"}</span>
                </>
              )}
            </div>

            {testInvoiceResult.claveAcceso && (
              <div className="space-y-1 font-sans tabular-nums text-[11px] bg-white/80 dark:bg-black/30 p-2.5 rounded-lg border border-border/60">
                <div><strong>Clave de Acceso (49 dígitos):</strong> {testInvoiceResult.claveAcceso}</div>
                <div><strong>Nº Autorización:</strong> {testInvoiceResult.numeroAutorizacion || testInvoiceResult.claveAcceso}</div>
                {testInvoiceResult.fechaAutorizacion && (
                  <div><strong>Fecha Autorización:</strong> {testInvoiceResult.fechaAutorizacion}</div>
                )}
              </div>
            )}

            {testInvoiceResult.rideUrl && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <a
                  href={testInvoiceResult.rideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-xs underline text-emerald-700 dark:text-emerald-300 hover:text-emerald-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver RIDE PDF en vivo
                </a>
                {testInvoiceResult.xmlUrl && (
                  <a
                    href={testInvoiceResult.xmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-xs underline text-slate-700 dark:text-slate-300 hover:text-slate-800 ml-3"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar XML firmado
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 8. Barra de Acción / Guardar Cambios */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/70">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 shadow-2xs ring-1 ring-white/60 dark:ring-slate-800">
            <img
              src="https://flagcdn.com/w80/ec.png"
              alt="Bandera de Ecuador"
              className="h-full w-full object-cover scale-110 rounded-full"
              loading="lazy"
            />
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Oficial para el <strong className="font-bold text-foreground">Servicio de Rentas Internas SRI</strong>
            <span className="text-slate-500 dark:text-slate-400 font-normal"> · Ecuador 🇪🇨</span>
          </span>
        </div>

        <Button
          onClick={handleSaveAndSyncSRI}
          disabled={saving}
          className="h-11 px-8 rounded-xl font-bold bg-[#1B4B73] hover:bg-[#163e5f] text-white shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Guardar y Sincronizar con SRI</span>
        </Button>
      </div>
    </div>
  );
}
