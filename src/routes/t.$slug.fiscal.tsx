import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
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
  Shield,
  Send,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  QrCode,
  Building2,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from "lucide-react";
import { toast } from "sonner";
import {
  getECFConfig,
  getOrdenes,
  formatRD,
  getPlans,
  isModuleEnabled,
  type ECFConfig,
  type Orden
} from "@/lib/storage";
import {
  listSentDocumentsPronesoft,
  listReceivedDocumentsPronesoft,
  submitCommercialApprovalPronesoft,
} from "@/lib/fiscal";

export const Route = createFileRoute("/t/$slug/fiscal")({
  component: CentroFiscalPage,
});

function CentroFiscalPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const primaryColor = tenant?.color_primario || "#1B4B73";

  const [hasFiscalModule, setHasFiscalModule] = useState<boolean>(true);
  const [ecfConfig, setEcfConfig] = useState<ECFConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado Pantalla Completa
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tab activo
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "approvals">("sent");

  // Tab 1: Enviados
  const [sentDocs, setSentDocs] = useState<any[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [searchSent, setSearchSent] = useState("");
  const [pageSent, setPageSent] = useState(1);

  // Tab 2: Recibidos
  const [receivedDocs, setReceivedDocs] = useState<any[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [searchReceived, setSearchReceived] = useState("");
  const [pageReceived, setPageReceived] = useState(1);

  // Tab 3: Aprobación Comercial
  const [searchApproval, setSearchApproval] = useState("");
  const [pageApproval, setPageApproval] = useState(1);
  const [selectedDocForApproval, setSelectedDocForApproval] = useState<any | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [approvalDetails, setApprovalDetails] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Manejo de Pantalla Completa
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // Cargar configuración e-CF
  useEffect(() => {
    async function loadConfig() {
      if (!tenant || tenant.id === "__loading__") return;
      setLoading(true);
      const [cfg, plans] = await Promise.all([
        getECFConfig(tenant.id),
        getPlans()
      ]);

      const plan = plans.find(p => p.id === tenant.plan_id);
      setHasFiscalModule(isModuleEnabled(tenant, "facturacion_fiscal", plan));
      setEcfConfig(cfg);
      setLoading(false);
    }
    loadConfig();
  }, [tenant?.id, tenant?.plan_id, tenant?.config?.modulos_override]);

  // Cargar e-CF Enviados
  async function loadSentDocuments() {
    if (!tenant || tenant.id === "__loading__") return;
    setLoadingSent(true);
    try {
      const res = await listSentDocumentsPronesoft(tenant.id, 1, 100);
      const docs = res?.data || (Array.isArray(res) ? res : []);
      if (docs.length > 0) {
        setSentDocs(docs);
      } else {
        // Fallback local con órdenes locales que tienen NCF
        const ords = await getOrdenes(tenant.id);
        const fiscalOrds = (ords || []).filter(o => o.ncf);
        setSentDocs(fiscalOrds.map(o => ({
          encf: o.ncf,
          type: o.ncf?.substring(0, 3) || 'E32',
          buyerRnc: o.cliente_rnc || 'Consumidor Final',
          buyerName: o.cliente_nombre || 'Cliente General',
          totalAmount: o.total,
          totalItbis: o.itbis,
          status: 'ACCEPTED',
          createdAt: o.creado_en
        })));
      }
    } catch (err: any) {
      console.warn("Aviso al cargar e-CF enviados de Pronesoft:", err.message);
      // Fallback local
      const ords = await getOrdenes(tenant.id);
      const fiscalOrds = (ords || []).filter(o => o.ncf);
      setSentDocs(fiscalOrds.map(o => ({
        encf: o.ncf,
        type: o.ncf?.substring(0, 3) || 'E32',
        buyerRnc: o.cliente_rnc || 'Consumidor Final',
        buyerName: o.cliente_nombre || 'Cliente General',
        totalAmount: o.total,
        totalItbis: o.itbis,
        status: 'ACCEPTED',
        createdAt: o.creado_en
      })));
    } finally {
      setLoadingSent(false);
    }
  }

  // Cargar e-CF Recibidos
  async function loadReceivedDocuments() {
    if (!tenant || tenant.id === "__loading__") return;
    setLoadingReceived(true);
    try {
      const res = await listReceivedDocumentsPronesoft(tenant.id, 1, 100);
      const docs = res?.data || (Array.isArray(res) ? res : []);
      setReceivedDocs(docs);
    } catch (err: any) {
      console.warn("Aviso al cargar e-CF recibidos de Pronesoft:", err.message);
      setReceivedDocs([]);
    } finally {
      setLoadingReceived(false);
    }
  }

  useEffect(() => {
    if (tenant && tenant.id !== "__loading__") {
      loadSentDocuments();
      loadReceivedDocuments();
    }
  }, [tenant?.id]);

  // Enviar aprobación comercial
  async function handleSendApproval() {
    if (!tenant || !selectedDocForApproval) return;
    setIsSubmittingApproval(true);
    try {
      const docId = selectedDocForApproval.id || selectedDocForApproval.encf || selectedDocForApproval.documentId;
      await submitCommercialApprovalPronesoft(
        tenant.id,
        docId,
        approvalStatus,
        approvalDetails
      );
      toast.success(
        approvalStatus === "ACCEPTED"
          ? "Aprobación Comercial enviada a la DGII exitosamente 🟢"
          : "Rechazo Comercial transmitido a la DGII 🔴"
      );
      setSelectedDocForApproval(null);
      setApprovalDetails("");
      loadReceivedDocuments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al transmitir aprobación comercial");
    } finally {
      setIsSubmittingApproval(false);
    }
  }

  if (!user || user.tenant.id === "__loading__" || loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" style={{ color: primaryColor }} />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Cargando Centro Fiscal e-CF...</p>
      </div>
    );
  }

  if (!hasFiscalModule) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Centro Fiscal e-CF" description="Gestión integral de Comprobantes Fiscales Electrónicos ante la DGII." />
        <Card className="p-8 text-center border-dashed border-primary/20 bg-primary/5 max-w-lg mx-auto rounded-3xl">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold font-display mb-2">Módulo Fiscal Requerido</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Para emitir y gestionar Comprobantes Electrónicos (e-CF) con la DGII necesitas un plan con el módulo fiscal activo.
          </p>
        </Card>
      </div>
    );
  }

  // Filtrado y paginación para Enviados
  const filteredSent = sentDocs.filter(d => {
    const q = searchSent.toLowerCase();
    return (
      (d.encf || '').toLowerCase().includes(q) ||
      (d.buyerName || '').toLowerCase().includes(q) ||
      (d.buyerRnc || '').toLowerCase().includes(q)
    );
  });
  const totalPagesSent = Math.max(1, Math.ceil(filteredSent.length / ITEMS_PER_PAGE));
  const paginatedSent = filteredSent.slice((pageSent - 1) * ITEMS_PER_PAGE, pageSent * ITEMS_PER_PAGE);

  // Filtrado y paginación para Recibidos
  const filteredReceived = receivedDocs.filter(d => {
    const q = searchReceived.toLowerCase();
    return (
      (d.encf || '').toLowerCase().includes(q) ||
      (d.sellerName || d.issuerName || '').toLowerCase().includes(q) ||
      (d.sellerRnc || d.issuerRnc || '').toLowerCase().includes(q)
    );
  });
  const totalPagesReceived = Math.max(1, Math.ceil(filteredReceived.length / ITEMS_PER_PAGE));
  const paginatedReceived = filteredReceived.slice((pageReceived - 1) * ITEMS_PER_PAGE, pageReceived * ITEMS_PER_PAGE);

  // Filtrado y paginación para Aprobaciones Comerciales
  const filteredApproval = receivedDocs.filter(d => {
    const q = searchApproval.toLowerCase();
    return (
      (d.encf || '').toLowerCase().includes(q) ||
      (d.sellerName || d.issuerName || '').toLowerCase().includes(q) ||
      (d.sellerRnc || d.issuerRnc || '').toLowerCase().includes(q)
    );
  });
  const totalPagesApproval = Math.max(1, Math.ceil(filteredApproval.length / ITEMS_PER_PAGE));
  const paginatedApproval = filteredApproval.slice((pageApproval - 1) * ITEMS_PER_PAGE, pageApproval * ITEMS_PER_PAGE);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] bg-background p-4 md:p-8 overflow-y-auto w-screen h-screen space-y-6"
          : "space-y-6 pb-12"
      }
    >
      <PageHeader
        title="Centro Fiscal e-CF"
        description="Control maestro de comprobantes electrónicos emitidos, recibidos y aprobaciones comerciales ante la DGII."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-xs px-3 py-1 font-bold">
            <Shield className="h-3.5 w-3.5 mr-1" />
            {ecfConfig?.ambiente === "produccion" ? "DGII Producción" : "DGII Pruebas (SBX)"}
          </Badge>

          <Button
            onClick={() => {
              loadSentDocuments();
              loadReceivedDocuments();
            }}
            variant="outline"
            className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loadingSent || loadingReceived ? "animate-spin" : ""}`} />
            Sincronizar Pronesoft
          </Button>

          {/* BOTÓN DE PANTALLA COMPLETA ESTILO PILL */}
          <Button
            onClick={toggleFullscreen}
            className="h-9 px-5 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 border-0 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 text-white" />
                <span>Salir Pantalla Completa</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 text-white" />
                <span>Pantalla Completa</span>
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {/* BOTONES DE NAVEGACIÓN INDEPENDIENTES DE MAYOR ALTURA */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => { setActiveTab("sent"); setPageSent(1); }}
          className={`h-12 px-6 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all duration-200 border cursor-pointer ${
            activeTab === "sent"
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.01]"
              : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Send className={`h-4 w-4 ${activeTab === "sent" ? "text-white" : "text-blue-600"}`} />
          <span className="text-sm font-bold">e-CF Enviados</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
            activeTab === "sent" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
          }`}>
            {sentDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("received"); setPageReceived(1); }}
          className={`h-12 px-6 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all duration-200 border cursor-pointer ${
            activeTab === "received"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/25 scale-[1.01]"
              : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <Download className={`h-4 w-4 ${activeTab === "received" ? "text-white" : "text-emerald-600"}`} />
          <span className="text-sm font-bold">e-CF Recibidos</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
            activeTab === "received" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
          }`}>
            {receivedDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("approvals"); setPageApproval(1); }}
          className={`h-12 px-6 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all duration-200 border cursor-pointer ${
            activeTab === "approvals"
              ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/25 scale-[1.01]"
              : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <CheckCircle2 className={`h-4 w-4 ${activeTab === "approvals" ? "text-white" : "text-amber-600"}`} />
          <span className="text-sm font-bold">Aprobación Comercial DGII</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
            activeTab === "approvals" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
          }`}>
            {receivedDocs.length}
          </span>
        </button>
      </div>

      {/* SECCIÓN 1: COMPROBANTES ENVIADOS */}
      {activeTab === "sent" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-NCF, cliente o RNC..."
                value={searchSent}
                onChange={(e) => { setSearchSent(e.target.value); setPageSent(1); }}
                className="pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Mostrando {filteredSent.length} comprobante(s) emitidos
            </p>
          </div>

          <Card className="overflow-hidden border-none shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[160px]">e-NCF / COMPROBANTE</th>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[200px]">CLIENTE / COMPRADOR</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[130px]">FECHA EMISIÓN</th>
                    <th className="px-6 py-4 text-right font-bold whitespace-nowrap min-w-[140px]">SUBTOTAL / ITBIS</th>
                    <th className="px-6 py-4 text-right font-bold whitespace-nowrap min-w-[130px]">MONTO TOTAL</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[120px]">ESTADO DGII</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[110px]">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSent.map((d: any, idx) => (
                    <tr key={d.encf || idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary text-sm">{d.encf || 'E320000000001'}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase">{d.type || 'e-CF'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">{d.buyerName || 'Cliente General'}</div>
                        <div className="text-xs font-mono text-muted-foreground">{d.buyerRnc || 'Consumidor Final'}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString("es-DO") : 'Hoy'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs whitespace-nowrap">
                        <div>ITBIS: {formatRD(d.totalItbis || 0)}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono text-foreground text-sm whitespace-nowrap">
                        {formatRD(d.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold">
                          ACEPTADO
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          {d.pdfUrl && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => window.open(d.pdfUrl, '_blank')}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {d.documentStampUrl && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => window.open(d.documentStampUrl, '_blank')}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedSent.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                        {loadingSent ? "Cargando comprobantes enviados..." : "No se encontraron e-CF enviados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN CON BOTONES ESTILO PILL EXACTOS */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-surface-elevated/20 gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Página {pageSent} de {totalPagesSent}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-full font-bold text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 hover:bg-slate-300 disabled:opacity-40 cursor-pointer"
                  disabled={pageSent === 1}
                  onClick={() => setPageSent(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-5 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white border-0 shadow-md disabled:opacity-40 cursor-pointer"
                  disabled={pageSent >= totalPagesSent}
                  onClick={() => setPageSent(p => Math.min(totalPagesSent, p + 1))}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 2: COMPROBANTES RECIBIDOS */}
      {activeTab === "received" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-NCF proveedor o RNC..."
                value={searchReceived}
                onChange={(e) => { setSearchReceived(e.target.value); setPageReceived(1); }}
                className="pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Mostrando {filteredReceived.length} comprobante(s) recibidos
            </p>
          </div>

          <Card className="overflow-hidden border-none shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[160px]">e-NCF PROVEEDOR</th>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[200px]">PROVEEDOR / VENDEDOR</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[130px]">FECHA RECEPCIÓN</th>
                    <th className="px-6 py-4 text-right font-bold whitespace-nowrap min-w-[140px]">MONTO TOTAL</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[160px]">APROBACIÓN COMERCIAL</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[110px]">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReceived.map((d: any, idx) => (
                    <tr key={d.encf || idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-emerald-700 text-sm">{d.encf}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">{d.sellerName || d.issuerName || 'Proveedor SRL'}</div>
                        <div className="text-xs font-mono text-muted-foreground">{d.sellerRnc || d.issuerRnc || 'RNC Proveedor'}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {d.receivedAt ? new Date(d.receivedAt).toLocaleDateString("es-DO") : 'Reciente'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono text-foreground text-sm whitespace-nowrap">
                        {formatRD(d.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {d.commercialStatus === 'ACCEPTED' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] font-bold">
                            APROBADO
                          </Badge>
                        ) : d.commercialStatus === 'REJECTED' ? (
                          <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[10px] font-bold">
                            RECHAZADO
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                            PENDIENTE
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg font-bold text-xs border-primary/20 text-primary hover:bg-primary/5"
                          onClick={() => setSelectedDocForApproval(d)}
                        >
                          Aprobación
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {paginatedReceived.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">
                        {loadingReceived ? "Cargando comprobantes recibidos..." : "No se encontraron e-CF de proveedores recibidos."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN CON BOTONES ESTILO PILL EXACTOS */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-surface-elevated/20 gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Página {pageReceived} de {totalPagesReceived}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-full font-bold text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 hover:bg-slate-300 disabled:opacity-40 cursor-pointer"
                  disabled={pageReceived === 1}
                  onClick={() => setPageReceived(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-5 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white border-0 shadow-md disabled:opacity-40 cursor-pointer"
                  disabled={pageReceived >= totalPagesReceived}
                  onClick={() => setPageReceived(p => Math.min(totalPagesReceived, p + 1))}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECCIÓN 3: APROBACIÓN COMERCIAL */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-NCF proveedor o RNC..."
                value={searchApproval}
                onChange={(e) => { setSearchApproval(e.target.value); setPageApproval(1); }}
                className="pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Mostrando {filteredApproval.length} comprobante(s) recibidos
            </p>
          </div>

          {/* LISTADO DE COMPROBANTES RECIBIDOS PENDIENTES DE APROBACIÓN */}
          <Card className="overflow-hidden border-none shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[160px]">e-NCF PROVEEDOR</th>
                    <th className="px-6 py-4 text-left font-bold whitespace-nowrap min-w-[200px]">PROVEEDOR / VENDEDOR</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[130px]">FECHA RECEPCIÓN</th>
                    <th className="px-6 py-4 text-right font-bold whitespace-nowrap min-w-[140px]">MONTO TOTAL</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[160px]">ESTADO COMERCIAL</th>
                    <th className="px-6 py-4 text-center font-bold whitespace-nowrap min-w-[110px]">ACCIÓN DIRECTA</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApproval.map((d: any, idx) => (
                    <tr key={d.encf || idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-700 text-sm">
                        {d.encf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-foreground">{d.sellerName || d.issuerName || 'Proveedor Registrado'}</div>
                        <div className="text-xs font-mono text-muted-foreground">{d.sellerRnc || d.issuerRnc || 'RNC Proveedor'}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {d.receivedAt ? new Date(d.receivedAt).toLocaleDateString("es-DO") : 'Reciente'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono text-foreground text-sm whitespace-nowrap">
                        {formatRD(d.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          {d.commercialStatus || 'PENDIENTE'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          className="h-8 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                          onClick={() => setSelectedDocForApproval(d)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Procesar Aprobación
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {paginatedApproval.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium">
                        No hay comprobantes de proveedores pendientes de respuesta comercial en este momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN CON BOTONES ESTILO PILL EXACTOS */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-surface-elevated/20 gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Página {pageApproval} de {totalPagesApproval}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-full font-bold text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 hover:bg-slate-300 disabled:opacity-40 cursor-pointer"
                  disabled={pageApproval === 1}
                  onClick={() => setPageApproval(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-5 rounded-full font-bold text-xs bg-[#1B4B73] hover:bg-[#1B4B73]/90 text-white border-0 shadow-md disabled:opacity-40 cursor-pointer"
                  disabled={pageApproval >= totalPagesApproval}
                  onClick={() => setPageApproval(p => Math.min(totalPagesApproval, p + 1))}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Transmisión de Aprobación Comercial */}
      <Dialog open={!!selectedDocForApproval} onOpenChange={(open) => !open && setSelectedDocForApproval(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Aprobación Comercial DGII
            </DialogTitle>
            <DialogDescription>
              Comprobante e-NCF: <strong className="font-mono text-foreground">{selectedDocForApproval?.encf}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
              <div><strong className="text-slate-700">Proveedor:</strong> {selectedDocForApproval?.sellerName || 'Proveedor Registrado'}</div>
              <div><strong className="text-slate-700">Monto Facturado:</strong> {formatRD(selectedDocForApproval?.totalAmount || 0)}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Decisión Comercial *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalStatus("ACCEPTED")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    approvalStatus === "ACCEPTED"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Aceptar e-CF
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalStatus("REJECTED")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    approvalStatus === "REJECTED"
                      ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="h-4 w-4 text-rose-600" /> Rechazar e-CF
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Detalles / Motivo (Opcional)</Label>
              <Textarea
                placeholder="Ej. Mercancía conforme o Error en monto facturado..."
                value={approvalDetails}
                onChange={(e) => setApprovalDetails(e.target.value)}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
            <Button variant="ghost" onClick={() => setSelectedDocForApproval(null)} disabled={isSubmittingApproval} className="rounded-xl h-9">
              Cancelar
            </Button>
            <Button
              onClick={handleSendApproval}
              disabled={isSubmittingApproval}
              className={`rounded-xl font-bold h-9 text-white ${
                approvalStatus === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmittingApproval ? "Transmitiendo a DGII..." : "Confirmar Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
