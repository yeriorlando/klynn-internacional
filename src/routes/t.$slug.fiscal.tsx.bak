import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
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
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Layers,
  ShoppingBag,
  Receipt,
  Filter,
  Eye,
  Copy,
  PlusCircle,
  Trash2,
  Ban,
  Bell,
  BellOff,
  Calendar,
  FileSpreadsheet,
  ArrowDownLeft,
  Store,
  FileCheck,
  Undo2,
  Settings,
  Flame,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatRD,
  isModuleEnabled,
  getECFDocumentosRecibidos,
  saveOrden,
  saveECFDocument,
  updateEstadoComercialECF,
  saveGasto,
  type ECFConfig,
  type ECFSequence,
  type ECFDocument,
  type Orden,
} from "@/lib/storage";
import {
  useECFConfig,
  usePlans,
  useOrdenes,
  useGastos,
  useECFDocuments,
  useECFSequences,
} from "@/hooks/use-queries";
import {
  sincronizarEstadoECF,
  getDocumentAuditEF2,
  syncSequencesEF2,
  createSequenceEF2,
  emitirECF,
  getEF2Client,
} from "@/lib/fiscal";

export const Route = createFileRoute("/t/$slug/fiscal")({
  component: CentroFiscalPage,
});

type FiscalSubView =
  | "hub"
  | "auditoria"
  | "secuencias"
  | "notas-credito"
  | "gastos-compras"
  | "reportes-dgii"
  | "catalogos-errores";

const NCF_NOMBRES: Record<string, string> = {
  E31: "Factura de Crédito Fiscal",
  E32: "Factura de Consumo / Final",
  E33: "Nota de Débito",
  E34: "Nota de Crédito",
  E41: "Comprobante de Compras",
  E43: "Gastos Menores / Caja Chica",
  E44: "Regímenes Especiales",
  E45: "Gubernamental",
  E46: "Exportaciones",
  E47: "Pagos al Exterior",
};

// Diccionario oficial de Errores DGII / EF2
const DGII_ERRORES_CATALOG = [
  {
    codigo: "145",
    tipo: "DGII_RECHAZO",
    titulo: "Fecha de vencimiento de secuencia inválida",
    causa: "La secuencia autorizada por la DGII para este tipo de e-CF ha expirado o la fecha enviada no coincide con los registros fiscales.",
    solucion: "Solicita un nuevo rango de comprobantes en la Oficina Virtual de la DGII y actualiza la fecha en Secuencias e-NCF.",
  },
  {
    codigo: "3",
    tipo: "DGII_RECHAZO",
    titulo: "e-NCF no válido o ya utilizado",
    causa: "El número de comprobante fiscal electrónico ya fue recibido previamente por la DGII o se encuentra fuera del rango activo.",
    solucion: "Sincroniza las secuencias con EF2 para actualizar el contador 'secuencia_actual'. No reenvíes el mismo número.",
  },
  {
    codigo: "1209",
    tipo: "DGII_RECHAZO",
    titulo: "Elemento hijo inválido (Invalid Child Element)",
    causa: "La estructura XML contiene campos no permitidos para este tipo de e-CF (ej: IndicadorMontoGravado en E44 o E47).",
    solucion: "Klynn y EF2 limpian estos campos automáticamente. Verifica que el tipo de comprobante seleccionado sea el correcto.",
  },
  {
    codigo: "48",
    tipo: "DGII_RECHAZO",
    titulo: "RNC emisor o receptor inactivo en DGII",
    causa: "El RNC ingresado no está registrado, fue suspendido o está dado de baja en el padrón nacional de contribuyentes.",
    solucion: "Verifica el RNC en el portal de Consulta RNC de la DGII. Si es un consumidor final local, utiliza E32 sin RNC.",
  },
  {
    codigo: "REF_NOT_FOUND",
    tipo: "DGII_RECHAZO",
    titulo: "NCFModificado no encontrado en DGII",
    causa: "Al emitir una Nota de Crédito (E34) o Débito (E33), la factura original referenciada no existe o fue rechazada por la DGII.",
    solucion: "Asegúrate de que la factura original tenga estado 'ACCEPTED' en DGII antes de aplicarle una Nota de Crédito.",
  },
  {
    codigo: "TOTAL_MISMATCH",
    tipo: "VALIDATION_ERROR",
    titulo: "Monto total no coincide con detalle de items",
    causa: "La sumatoria de los items con ITBIS más montos exentos no cuadra exactamente con MontoTotal.",
    solucion: "Revisa los descuentos aplicados. Klynn ajusta los centavos automáticamente al convertir órdenes a e-CF.",
  },
  {
    codigo: "AUTH_401",
    tipo: "AUTH_ERROR",
    titulo: "Token EF2 inválido o expirado",
    causa: "El Bearer Token de EF2 configurado para la lavandería fue modificado o caducó.",
    solucion: "Dirígete a Configuración > Pestaña Fiscal y verifica o vuelve a guardar el token provisto por EF2 (tok_...).",
  },
];

// Catálogo oficial de Medios de Pago DGII
const DGII_MEDIOS_PAGO = [
  { codigo: "1", nombre: "Efectivo", descripcion: "Pagos en moneda local / caja" },
  { codigo: "2", nombre: "Cheque / Transferencia / Depósito", descripcion: "Pagos bancarios directos" },
  { codigo: "3", nombre: "Tarjeta de Crédito / Débito", descripcion: "Cobros vía terminal POS / pasarela" },
  { codigo: "4", nombre: "Compra a Crédito", descripcion: "Facturas a crédito (CxC)" },
  { codigo: "5", nombre: "Permuta", descripcion: "Intercambio de bienes o servicios" },
  { codigo: "6", nombre: "Nota de Crédito", descripcion: "Compensación con saldo a favor" },
  { codigo: "7", nombre: "Mixto", descripcion: "Combinación de varios métodos de pago" },
];

function CentroFiscalPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";
  const navigate = useNavigate();

  const { data: ecfConfig, isLoading: loadingConfig } = useECFConfig(tenantId);
  const { data: plans = [] } = usePlans();
  const { data: rawOrds = [] } = useOrdenes(tenantId);
  const { data: rawGastos = [] } = useGastos(tenantId);
  const { data: rawEcfDocs = [] } = useECFDocuments(tenantId);
  const { data: rawSequences = [] } = useECFSequences(tenantId);

  const activePlan = plans.find((p) => p.id === tenant?.plan_id);
  const hasFiscalModule = isModuleEnabled(tenant || null, "facturacion_fiscal", activePlan);
  const isECFActive = Boolean(ecfConfig?.is_active);

  // Sub-vista activa
  const [currentView, setCurrentView] = useState<FiscalSubView>("hub");

  // Estado general de carga y sincronización
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);

  // --- SUB-VISTA 1: AUDITORÍA EN VIVO ---
  const [searchAudit, setSearchAudit] = useState("");
  const [filterTypeAudit, setFilterTypeAudit] = useState<string>("ALL");
  const [filterStatusAudit, setFilterStatusAudit] = useState<string>("ALL");
  const [pageAudit, setPageAudit] = useState(1);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLive, setLoadingAuditLive] = useState(false);
  const [qrModalDoc, setQrModalDoc] = useState<any | null>(null);

  // --- SUB-VISTA 2: SECUENCIAS ---
  const [isSyncingSeqs, setIsSyncingSeqs] = useState(false);
  const [showNewSeqModal, setShowNewSeqModal] = useState(false);
  const [newSeqType, setNewSeqType] = useState("E32");
  const [newSeqFrom, setNewSeqFrom] = useState("");
  const [newSeqTo, setNewSeqTo] = useState("");
  const [newSeqExp, setNewSeqExp] = useState("");
  const [isSavingSeq, setIsSavingSeq] = useState(false);

  // --- SUB-VISTA 3: NOTAS DE CRÉDITO (E34) ---
  const [showNewNCModal, setShowNewNCModal] = useState(false);
  const [selectedInvoiceForNC, setSelectedInvoiceForNC] = useState<any | null>(null);
  const [ncModCode, setNcModCode] = useState("1"); // 1=Anulación, 2=Corrección texto, 3=Devolución, 4=Descuento
  const [ncReason, setNcReason] = useState("");
  const [isEmittingNC, setIsEmittingNC] = useState(false);

  // --- SUB-VISTA 4: GASTOS MENORES (E43) Y COMPRAS (E41) ---
  const [expenseType, setExpenseType] = useState<"E43" | "E41">("E43");
  const [expenseFilter, setExpenseFilter] = useState<"ALL" | "E43" | "E41">("ALL");
  const [expenseConcept, setExpenseConcept] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseSupplierRnc, setExpenseSupplierRnc] = useState("");
  const [expenseSupplierName, setExpenseSupplierName] = useState("");
  const [isEmittingExpense, setIsEmittingExpense] = useState(false);

  // --- SUB-VISTA 5: REPORTES DGII (606, 607, 608) ---
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportTab, setReportTab] = useState<"607" | "606" | "608">("607");

  // --- SUB-VISTA 6: CATÁLOGOS Y ERRORES ---
  const [searchErrorQuery, setSearchErrorQuery] = useState("");

  // Formateadores automáticos de miles con comas para inputs
  const formatAmountInput = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join("") : null;
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (decimalPart !== null) {
      return formattedInteger + "." + decimalPart.substring(0, 2);
    }
    return formattedInteger;
  };

  const formatIntegerInput = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "").replace(/[^0-9]/g, "");
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseAmount = (val: string) => {
    const clean = String(val || "").replace(/,/g, "").replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
  };

  const ITEMS_PER_PAGE = 10;

  // Lista fusionada y reconciliada de comprobantes emitidos
  const sentDocuments = useMemo(() => {
    const ordersById = new Map((rawOrds || []).map((order: any) => [order.id, order]));
    const gastosByNcf = new Map((rawGastos || []).filter((g: any) => g.ncf).map((g: any) => [g.ncf, g]));
    const gastosById = new Map((rawGastos || []).map((g: any) => [g.id, g]));
    const localEcf = [...(rawEcfDocs || [])];
    const seenOrders = new Set<string>();
    const seenNcfs = new Set<string>();

    const list = localEcf
      .filter((doc: any) => doc.encf)
      .map((doc: any) => {
        const order: any = doc.order_id ? ordersById.get(doc.order_id) : undefined;
        const matchedGasto = (doc.order_id ? gastosById.get(doc.order_id) : undefined) || (doc.encf ? gastosByNcf.get(doc.encf) : undefined);
        if (order?.id) seenOrders.add(order.id);
        if (doc.encf) seenNcfs.add(doc.encf);
        const dgiiResp = doc.dgii_response || {};
        const rawQr =
          order?.ecf_qr ||
          doc.qr_content ||
          dgiiResp?.qr_link ||
          dgiiResp?.qr ||
          dgiiResp?.timbre_qr ||
          dgiiResp?.documentos?.qr ||
          dgiiResp?.UrlENCF ||
          dgiiResp?.url_encf ||
          doc.dgii_response?.qr_link;
        const secCode =
          doc.security_code ||
          order?.ecf_security_code ||
          dgiiResp?.codigo_seguridad ||
          dgiiResp?.cod_seguridad ||
          dgiiResp?.dgii?.codigo_seguridad;

        const docType = doc.tipo_ecf || doc.encf.substring(0, 3);
        const isExpenseDoc = docType === "E43" || docType === "E41" || doc.encf.startsWith("E43") || doc.encf.startsWith("E41");
        
        const docItems = dgiiResp?.payload?.ECF?.DetallesItems?.Item || dgiiResp?.DetallesItems?.Item || dgiiResp?.items;
        const itemConcept = Array.isArray(docItems)
          ? (docItems[0]?.NombreItem || docItems[0]?.DescripcionItem)
          : (docItems?.NombreItem || docItems?.DescripcionItem);

        const isE41Doc = docType === "E41" || doc.encf.startsWith("E41");
        const displayName = isExpenseDoc
          ? (isE41Doc
              ? (matchedGasto?.proveedor 
                  ? `${matchedGasto.proveedor}${matchedGasto.descripcion ? ` · ${matchedGasto.descripcion}` : ""}`
                  : (doc.rnc_receptor_nombre || matchedGasto?.descripcion || itemConcept || "Compra Informal"))
              : (matchedGasto?.descripcion || doc.rnc_receptor_nombre || itemConcept || "Gastos Menores"))
          : (order?.cliente_nombre || doc.rnc_receptor_nombre || "Consumidor Final");

        return {
          id: doc.id,
          encf: doc.encf,
          type: docType,
          buyerName: displayName,
          buyerRnc: doc.rnc_receptor || matchedGasto?.proveedor_rnc || (isExpenseDoc ? (isE41Doc ? "No especificado" : "-") : "Consumidor Final"),
          totalAmount: doc.monto_total ?? (matchedGasto?.monto ?? (order?.total ?? 0)),
          totalItbis: doc.monto_itbis ?? order?.itbis ?? 0,
          status:
            doc.status === "accepted" || doc.legal_status === "ACCEPTED" || /acept|aprob|procesad|registrad|emitid|completad/i.test(doc.status || "")
              ? "ACCEPTED"
              : doc.status === "accepted_with_reservations"
                ? "ACCEPTED_WITH_OBSERVATIONS"
                : doc.status === "rejected" || doc.legal_status === "REJECTED" || /rechaz|error/i.test(doc.status || "")
                  ? "REJECTED"
                  : "ACCEPTED",
          createdAt: doc.fecha_emision || matchedGasto?.fecha || order?.creado_en || new Date().toISOString(),
          pdfUrl: doc.pdf_url || dgiiResp?.documentos?.pdf || dgiiResp?.pdf_url,
          xmlUrl: doc.xml_url || dgiiResp?.documentos?.xml || dgiiResp?.xml_url,
          qrContent: rawQr,
          trackId: doc.track_id || dgiiResp?.track_id || dgiiResp?.dgii?.track_id,
          securityCode: secCode,
          signatureDate: doc.signature_date || dgiiResp?.fecha_firma_digital,
          orderId: doc.order_id,
        };
      });

    for (const gasto of (rawGastos || []).filter((g: any) => g.ncf && !seenNcfs.has(g.ncf))) {
      seenNcfs.add(gasto.ncf);
      const isE41Gasto = gasto.tipo_ecf === "E41" || gasto.ncf.startsWith("E41");
      const displayName = isE41Gasto
        ? (gasto.proveedor 
            ? `${gasto.proveedor}${gasto.descripcion ? ` · ${gasto.descripcion}` : ""}`
            : (gasto.descripcion || "Compra Informal"))
        : (gasto.descripcion || "Gastos Menores");

      list.push({
        id: gasto.id,
        encf: gasto.ncf,
        type: gasto.tipo_ecf || gasto.ncf.substring(0, 3),
        buyerName: displayName,
        buyerRnc: gasto.proveedor_rnc || (isE41Gasto ? "No especificado" : "-"),
        totalAmount: gasto.monto || 0,
        totalItbis: 0,
        status: gasto.ecf_status || "ACCEPTED",
        createdAt: gasto.fecha || new Date().toISOString(),
        pdfUrl: undefined,
        xmlUrl: undefined,
        qrContent: gasto.ecf_qr,
        trackId: gasto.ecf_track_id,
        securityCode: undefined,
        signatureDate: undefined,
        orderId: gasto.id,
      });
    }

    for (const order of (rawOrds || []).filter((item: any) => item.ncf && !seenOrders.has(item.id))) {
      const orderNcf = String(order.ncf);
      list.push({
        id: order.id,
        encf: orderNcf,
        type: order.tipo_ecf || orderNcf.substring(0, 3),
        buyerName: order.cliente_nombre || "Cliente General",
        buyerRnc: "Consumidor Final",
        totalAmount: order.total || 0,
        totalItbis: order.itbis || 0,
        status: order.ecf_status || "REGISTERED",
        createdAt: order.creado_en,
        pdfUrl: undefined,
        xmlUrl: undefined,
        qrContent: order.ecf_qr,
        trackId: undefined,
        securityCode: order.ecf_security_code,
        signatureDate: order.ecf_signature_date,
        orderId: order.id,
      });
    }

    list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return list;
  }, [rawEcfDocs, rawOrds, rawGastos]);

  function getDgiiValidationUrl(doc: any) {
    if (!doc) return "";
    if (doc.qrContent && typeof doc.qrContent === "string" && doc.qrContent.startsWith("http")) {
      return doc.qrContent;
    }
    const isProd = ecfConfig?.ef2_environment === "eCF" || (ecfConfig as any)?.environment === "production";
    const baseUrl = isProd
      ? "https://fc.dgii.gov.do/ecf/ConsultaTimbreFC"
      : "https://fc.dgii.gov.do/certecf/ConsultaTimbreFC";

    const rnc = (tenant?.rnc || ecfConfig?.rnc_emisor || "132596161").replace(/\D/g, "");
    const encf = doc.encf || "";
    const monto = Number(doc.totalAmount || 0).toFixed(2);
    const secCode = (doc.securityCode || "").trim();

    const params = new URLSearchParams();
    params.set("RncEmisor", rnc);
    params.set("ENCF", encf);
    params.set("MontoTotal", monto);
    if (secCode && secCode !== "null" && secCode !== "undefined") {
      params.set("CodigoSeguridad", secCode);
    }
    return `${baseUrl}?${params.toString()}`;
  }

  // Métricas generales del Hub
  const metrics = useMemo(() => {
    const totalFiscalAmount = sentDocuments
      .filter((d) => d.status === "ACCEPTED")
      .reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
    const totalAccepted = sentDocuments.filter((d) => d.status === "ACCEPTED").length;
    const totalPending = sentDocuments.filter((d) => d.status === "REGISTERED" || d.status === "pending").length;
    const totalRejected = sentDocuments.filter((d) => d.status === "REJECTED").length;
    const creditNotesCount = sentDocuments.filter((d) => d.type === "E34" || d.encf.startsWith("E34")).length;

    let availableSeqsCount = 0;
    let lowSeqsAlert = false;
    for (const seq of rawSequences) {
      const rem = Math.max(0, seq.valor_final - (seq.valor_actual || 0));
      availableSeqsCount += rem;
      if (rem <= (seq.alerta_limite ?? 50)) {
        lowSeqsAlert = true;
      }
    }

    return {
      totalFiscalAmount,
      totalAccepted,
      totalPending,
      totalRejected,
      creditNotesCount,
      availableSeqsCount,
      lowSeqsAlert,
      totalEmitted: sentDocuments.length,
    };
  }, [sentDocuments, rawSequences]);

  // Sincronización Global (Secuencias + e-CF pendientes)
  async function handleGlobalSync() {
    if (!tenant || tenant.id === "__loading__") return;
    setIsSyncingGlobal(true);
    try {
      toast.info("Consultando estado de e-CF y secuencias en EF2 API...");
      await Promise.allSettled([
        syncSequencesEF2(tenant.id),
        ...sentDocuments
          .filter((d) => d.status === "REGISTERED" && d.encf)
          .slice(0, 15)
          .map((d) => sincronizarEstadoECF(tenant.id, { id: d.id, encf: d.encf, monto_total: d.totalAmount } as any)),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenant.id] }),
        queryClient.invalidateQueries({ queryKey: ["ecf-sequences", tenant.id] }),
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenant.id] }),
      ]);
      toast.success("Centro Fiscal sincronizado exitosamente con EF2 y DGII ✓");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al sincronizar con EF2");
    } finally {
      setIsSyncingGlobal(false);
    }
  }

  // Auditoría en vivo de un comprobante
  async function handleAuditLive(doc: any) {
    if (!tenant || !doc?.encf) return;
    setSelectedAuditDetail(doc);
    setAuditLogs([]);
    setLoadingAuditLive(true);
    try {
      const res = await getDocumentAuditEF2(tenant.id, {
        encf: doc.encf,
        monto_esperado: doc.totalAmount,
      });
      const item = Array.isArray(res?.data) ? res.data[0] : res?.facturas?.[0] || res?.data || res;
      const dgii = item?.dgii || {};
      const docs = item?.documentos || {};

      setAuditLogs([
        {
          titulo: "Estado DGII",
          valor: dgii.estado || item?.estado_factura || item?.estado || "Sin respuesta",
          tipo: /rechaz|error/i.test(String(dgii.estado || item?.estado_factura || "")) ? "ERROR" : "SUCCESS",
          detalle: dgii.mensaje || item?.mensaje_respuesta || "Comprobante procesado por EF2",
        },
        {
          titulo: "Track ID DGII",
          valor: dgii.track_id || doc.trackId || "No asignado",
          tipo: "INFO",
          detalle: "Identificador único de recepción en el servidor de la DGII",
        },
        {
          titulo: "Firma Digital & Seguridad",
          valor: item?.fecha_firma_digital || dgii.fecha_recepcion || "Firmado",
          tipo: "INFO",
          detalle: "Código de seguridad: " + (item?.codigo_seguridad || dgii.codigo_seguridad || doc.securityCode || "N/A"),
        },
        {
          titulo: "Documentos en la Nube",
          valor: docs.pdf ? "PDF disponible" : "Generado",
          tipo: "INFO",
          detalle: docs.xml ? "XML firmado disponible para descarga" : "XML firmado en bóveda",
        },
      ]);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo consultar la auditoría en EF2.");
    } finally {
      setLoadingAuditLive(false);
    }
  }

  // Crear nueva secuencia en EF2
  async function handleCreateSequence() {
    if (!tenant || !newSeqFrom || !newSeqTo) {
      toast.error("Por favor completa los campos 'Desde' y 'Hasta'");
      return;
    }
    setIsSavingSeq(true);
    try {
      const fromNum = parseInt(newSeqFrom.replace(/,/g, "")) || 1;
      const toNum = parseInt(newSeqTo.replace(/,/g, "")) || 1;
      await createSequenceEF2(tenant.id, {
        type: newSeqType,
        from: fromNum,
        to: toNum,
        current: fromNum - 1,
        expiration: newSeqType === "E32" ? undefined : newSeqExp || undefined,
      });
      toast.success(`Rango para ${newSeqType} creado y sincronizado con EF2 ✓`);
      setShowNewSeqModal(false);
      setNewSeqFrom("");
      setNewSeqTo("");
      setNewSeqExp("");
      queryClient.invalidateQueries({ queryKey: ["ecf-sequences", tenant.id] });
    } catch (err: any) {
      toast.error(err.message || "Error al crear el rango en EF2");
    } finally {
      setIsSavingSeq(false);
    }
  }

  // Emitir Nota de Crédito (E34)
  async function handleEmitCreditNote() {
    if (!tenant || !selectedInvoiceForNC) {
      toast.error("Selecciona la factura original a modificar.");
      return;
    }
    if (!ncReason.trim()) {
      toast.error("Ingresa la razón o motivo de la Nota de Crédito.");
      return;
    }
    setIsEmittingNC(true);
    try {
      const dummyOrder: Orden = {
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        numero: `NC-${Date.now().toString().slice(-6)}`,
        cliente_nombre: selectedInvoiceForNC.buyerName,
        total: Number(selectedInvoiceForNC.totalAmount || 0),
        subtotal: Number(selectedInvoiceForNC.totalAmount || 0) - Number(selectedInvoiceForNC.totalItbis || 0),
        itbis: Number(selectedInvoiceForNC.totalItbis || 0),
        descuento: 0,
        estado: "ENTREGADO",
        metodo_pago: "EFECTIVO",
        tipo_ecf: "E34",
        saldo: 0,
        creado_en: new Date().toISOString(),
        items: [
          {
            descripcion: `Nota de Crédito por ${ncReason}`,
            cantidad: 1,
            precio_unitario: Number(selectedInvoiceForNC.totalAmount || 0) - Number(selectedInvoiceForNC.totalItbis || 0),
            is_exento: false,
          },
        ],
      } as any;

      toast.info("Emitiendo Nota de Crédito E34 en EF2...");

      const result = await emitirECF(
        dummyOrder,
        {
          id: "temp",
          nombre: selectedInvoiceForNC.buyerName,
          cedula: selectedInvoiceForNC.buyerRnc !== "Consumidor Final" ? selectedInvoiceForNC.buyerRnc : "132596161",
        } as any,
        undefined,
        { ncf_secuencia: "E34", itbis_incluido: false } as any,
        tenant,
        "E34",
        {
          ncf: selectedInvoiceForNC.encf,
          date: selectedInvoiceForNC.createdAt,
          code: ncModCode,
          reason: ncReason,
        }
      );

      toast.success(`Nota de Crédito ${result.encf} emitida exitosamente ante la DGII ✓`);
      setShowNewNCModal(false);
      setSelectedInvoiceForNC(null);
      setNcReason("");
      queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenant.id] });
    } catch (err: any) {
      toast.error(err.message || "Error al emitir Nota de Crédito en EF2.");
    } finally {
      setIsEmittingNC(false);
    }
  }

  // Emitir Comprobante de Compras (E41) o Gastos Menores (E43)
  async function handleEmitExpense() {
    const amt = parseAmount(expenseAmount);
    if (!tenant || !expenseConcept.trim() || amt <= 0) {
      toast.error("Completa el concepto y un monto válido.");
      return;
    }
    if (expenseType === "E41" && !expenseSupplierRnc.trim()) {
      toast.error("El Comprobante de Compras (E41) requiere el RNC/Cédula del proveedor.");
      return;
    }
    setIsEmittingExpense(true);
    try {
      const isE41 = expenseType === "E41";
      const itbisAmt = isE41 ? Number((amt * 0.18).toFixed(2)) : 0;
      const totalAmt = isE41 ? amt + itbisAmt : amt;

      const dummyExpenseOrder: Orden = {
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        numero: `EXP-${Date.now().toString().slice(-6)}`,
        cliente_nombre: isE41 ? expenseSupplierName || "Proveedor de Servicios" : expenseConcept,
        total: totalAmt,
        subtotal: amt,
        itbis: itbisAmt,
        descuento: 0,
        estado: "ENTREGADO",
        metodo_pago: "EFECTIVO",
        tipo_ecf: expenseType,
        saldo: 0,
        creado_en: new Date().toISOString(),
        items: [
          {
            descripcion: expenseConcept,
            cantidad: 1,
            precio_unitario: amt,
            is_exento: !isE41,
          },
        ],
      } as any;

      const result = await emitirECF(
        dummyExpenseOrder,
        isE41
          ? ({
              id: "supplier",
              nombre: expenseSupplierName || "Proveedor",
              cedula: expenseSupplierRnc,
            } as any)
          : ({
              id: "expense",
              nombre: expenseConcept,
              cedula: "",
            } as any),
        undefined,
        { ncf_secuencia: expenseType, itbis_incluido: false } as any,
        tenant,
        expenseType
      );

      // Guardar también en la base de datos de Gastos para sincronización perfecta
      try {
        await saveGasto({
          id: dummyExpenseOrder.id,
          tenant_id: tenant.id,
          empleado_id: user?.empleado?.id || tenant.id,
          categoria: isE41 ? "Mantenimiento" : "Servicios Básicos",
          descripcion: expenseConcept,
          monto: amt,
          metodo_pago: "Efectivo",
          proveedor: isE41 ? expenseSupplierName : undefined,
          proveedor_rnc: isE41 ? expenseSupplierRnc : undefined,
          ncf: result.encf,
          tipo_ecf: expenseType,
          ecf_status: result.legal_status || "ACCEPTED",
          ecf_track_id: result.track_id,
          ecf_qr: result.qr_content,
          fecha: new Date().toISOString(),
          aprobado: true,
        });
      } catch (gastoErr) {
        console.warn("Aviso al registrar gasto:", gastoErr);
      }

      toast.success(`Comprobante ${result.encf} (${expenseType}) emitido exitosamente ante la DGII ✓`);
      setExpenseConcept("");
      setExpenseAmount("");
      setExpenseSupplierRnc("");
      setExpenseSupplierName("");
      queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["gastos", tenant.id] });
    } catch (err: any) {
      toast.error(err.message || "Error al emitir comprobante de gasto en EF2.");
    } finally {
      setIsEmittingExpense(false);
    }
  }

  // Filtrado de auditoría
  const filteredAuditDocs = useMemo(() => {
    return sentDocuments.filter((d) => {
      const q = searchAudit.toLowerCase();
      const matchSearch =
        d.encf.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.buyerRnc.toLowerCase().includes(q);
      const matchType = filterTypeAudit === "ALL" || d.type === filterTypeAudit;
      const matchStatus = filterStatusAudit === "ALL" || d.status === filterStatusAudit;
      return matchSearch && matchType && matchStatus;
    });
  }, [sentDocuments, searchAudit, filterTypeAudit, filterStatusAudit]);

  const totalPagesAudit = Math.max(1, Math.ceil(filteredAuditDocs.length / ITEMS_PER_PAGE));
  const paginatedAuditDocs = filteredAuditDocs.slice((pageAudit - 1) * ITEMS_PER_PAGE, pageAudit * ITEMS_PER_PAGE);

  // Filtrado del catálogo de errores
  const filteredErrors = useMemo(() => {
    if (!searchErrorQuery.trim()) return DGII_ERRORES_CATALOG;
    const q = searchErrorQuery.toLowerCase();
    return DGII_ERRORES_CATALOG.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.titulo.toLowerCase().includes(q) ||
        e.causa.toLowerCase().includes(q) ||
        e.solucion.toLowerCase().includes(q)
    );
  }, [searchErrorQuery]);

  // Generador de archivos de Reportes DGII (606, 607, 608)
  const reportData = useMemo(() => {
    const period = `${reportYear}${reportMonth}`;
    const periodDocs = sentDocuments.filter((d) => {
      const date = new Date(d.createdAt);
      const docPeriod = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
      return docPeriod === period;
    });

    // 607: Ventas
    const rows607 = periodDocs.filter((d) => ["E31", "E32", "E44", "E45"].includes(d.type));
    // 606: Compras / Gastos Menores
    const rows606 = periodDocs.filter((d) => ["E41", "E43"].includes(d.type));
    // 608: Anulados / Notas de Crédito
    const rows608 = periodDocs.filter((d) => d.type === "E34" || d.status === "REJECTED");

    return {
      period,
      periodDocs,
      rows607,
      rows606,
      rows608,
      totalVentas: rows607.reduce((s, d) => s + Number(d.totalAmount || 0), 0),
      totalItbisVentas: rows607.reduce((s, d) => s + Number(d.totalItbis || 0), 0),
      totalCompras: rows606.reduce((s, d) => s + Number(d.totalAmount || 0), 0),
      totalAnulados: rows608.length,
    };
  }, [sentDocuments, reportYear, reportMonth]);

  function downloadReportTXT(type: "607" | "606" | "608") {
    const tenantRnc = tenant?.rnc?.replace(/\D/g, "") || "131703836";
    let content = "";

    if (type === "607") {
      // Header 607: 607|RNC|PERIODO|CANTIDAD_REGISTROS
      content = `607|${tenantRnc}|${reportData.period}|${reportData.rows607.length}\n`;
      reportData.rows607.forEach((d) => {
        const rncClient = d.buyerRnc === "Consumidor Final" ? "" : d.buyerRnc.replace(/\D/g, "");
        const tipoId = rncClient.length === 9 ? "1" : rncClient.length === 11 ? "2" : "3";
        const date = new Date(d.createdAt);
        const fechaComprobante = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
        const montoFacturado = Number(d.totalAmount || 0).toFixed(2);
        const montoItbis = Number(d.totalItbis || 0).toFixed(2);
        content += `${rncClient}|${tipoId}|${d.encf}||${fechaComprobante}||${montoFacturado}|${montoItbis}|||||||1\n`;
      });
    } else if (type === "606") {
      // Header 606: 606|RNC|PERIODO|CANTIDAD_REGISTROS
      content = `606|${tenantRnc}|${reportData.period}|${reportData.rows606.length}\n`;
      reportData.rows606.forEach((d) => {
        const rncSupplier = d.buyerRnc === "Consumidor Final" ? tenantRnc : d.buyerRnc.replace(/\D/g, "");
        const tipoId = rncSupplier.length === 9 ? "1" : "2";
        const date = new Date(d.createdAt);
        const fechaComprobante = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
        const monto = Number(d.totalAmount || 0).toFixed(2);
        content += `${rncSupplier}|${tipoId}|02|${d.encf}||${fechaComprobante}||${monto}|${monto}||0.00|0.00|0.00|0.00|01|1\n`;
      });
    } else if (type === "608") {
      // Header 608: 608|RNC|PERIODO|CANTIDAD_REGISTROS
      content = `608|${tenantRnc}|${reportData.period}|${reportData.rows608.length}\n`;
      reportData.rows608.forEach((d) => {
        const date = new Date(d.createdAt);
        const fechaComprobante = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
        content += `${d.encf}|${fechaComprobante}|01\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DGII_${type}_${tenantRnc}_${reportData.period}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Archivo DGII ${type}.txt descargado exitosamente`);
  }

  // --- GUARDS Y CONTROL DE ACCESO ---
  if (!user || user.tenant.id === "__loading__" || (loadingConfig && !ecfConfig)) {
    return <GlobalPageLoader text="Cargando Centro Fiscal e-CF..." />;
  }

  // 1. Guard de Módulo Fiscal por Plan
  if (!hasFiscalModule) {
    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <PageHeader
          title="Centro Fiscal DGII"
          description="Gestión integral de Facturación Electrónica (e-CF) certificada ante la DGII."
        />
        <Card className="p-10 text-center border-dashed border-primary/20 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground mb-2">Módulo Fiscal Requerido</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Para emitir y gestionar Comprobantes Fiscales Electrónicos (e-CF) con EF2 y la DGII necesitas un plan con el módulo fiscal activo.
          </p>
          <Button
            onClick={() => tenant && navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug } })}
            className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white"
          >
            Ver Planes Disponibles
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Guard de Facturación Electrónica Activa en /configuracion
  if (!isECFActive) {
    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <PageHeader
          title="Centro Fiscal DGII"
          description="Gestión integral de Facturación Electrónica (e-CF) certificada ante la DGII."
        />
        <Card className="p-10 text-center border-dashed border-amber-300 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
          <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground mb-2">Facturación Electrónica Inactiva</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Tu plan tiene habilitado el módulo fiscal, pero la <strong>Facturación Electrónica (e-CF)</strong> aún no está activa en tu configuración o falta guardar tu Token de EF2.
          </p>
          <Button
            onClick={() => tenant && navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug } })}
            className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white gap-2 shadow-md"
          >
            <Settings className="h-4 w-4" /> Ir a Configuración Fiscal y Activar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER PRINCIPAL CON BOTONES ALINEADOS A LA DERECHA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Centro Fiscal DGII / e-CF
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Plataforma unificada para emisión, trazabilidad DGII, secuencias e-NCF, notas de crédito y reportes tributarios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto">
          {/* Badge de Ambiente */}
          <Badge
            variant="outline"
            className="h-10 px-3.5 rounded-xl border-slate-200/90 bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center gap-2 shadow-2xs"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{ecfConfig?.ef2_environment || "TesteCF"}</span>
          </Badge>

          {/* Sincronizar EF2 en vivo */}
          <Button
            onClick={handleGlobalSync}
            disabled={isSyncingGlobal}
            className="h-10 px-4 rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white border border-[#1B4B73] shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer text-xs shrink-0"
          >
            <RefreshCw className={`h-4 w-4 text-[#F0B900] ${isSyncingGlobal ? "animate-spin" : ""}`} />
            <span>Sincronizar EF2</span>
          </Button>

          {/* Enlace rápido a Configuración */}
          <Button
            variant="outline"
            onClick={() => tenant && navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug } })}
            className="h-10 px-3.5 rounded-xl font-bold border-slate-200/90 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer"
            title="Configuración de credenciales y parámetros fiscales"
          >
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </Button>
        </div>
      </div>

      {/* BARRA DE BOTONES SUPERIORES EN 2 FILAS CON COLORES DE FONDO INDIVIDUALES (VISIBILIDAD TOTAL AL VISTAZO) */}
      <div className="space-y-2.5 w-full pb-2">
        {/* FILA 1: 4 PRIMEROS BOTONES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Botón 1: Panel Principal */}
          <button
            type="button"
            onClick={() => setCurrentView("hub")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "hub"
                ? "bg-[#1B4B73] text-white border-[#1B4B73] shadow-md ring-2 ring-[#1B4B73]/25 scale-[1.01]"
                : "bg-slate-100/90 hover:bg-slate-200 text-slate-800 border-slate-300/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span className="truncate">Panel Principal</span>
          </button>

          {/* Botón 2: Auditoría e-CF */}
          <button
            type="button"
            onClick={() => setCurrentView("auditoria")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "auditoria"
                ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/25 scale-[1.01]"
                : "bg-blue-50/90 hover:bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
            }`}
          >
            <FileCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">1. Auditoría e-CF en Vivo</span>
          </button>

          {/* Botón 3: Secuencias */}
          <button
            type="button"
            onClick={() => setCurrentView("secuencias")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "secuencias"
                ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/25 scale-[1.01]"
                : "bg-amber-50/90 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">2. Secuencias e-NCF</span>
          </button>

          {/* Botón 4: Notas de Crédito */}
          <button
            type="button"
            onClick={() => setCurrentView("notas-credito")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "notas-credito"
                ? "bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/25 scale-[1.01]"
                : "bg-purple-50/90 hover:bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
            }`}
          >
            <Undo2 className="h-4 w-4 shrink-0" />
            <span className="truncate">3. Notas de Crédito (E34)</span>
          </button>
        </div>

        {/* FILA 2: 3 BOTONES SIGUIENTES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Botón 5: Gastos & Compras */}
          <button
            type="button"
            onClick={() => setCurrentView("gastos-compras")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "gastos-compras"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/25 scale-[1.01]"
                : "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            }`}
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="truncate">4. Gastos & Compras (E41/E43)</span>
          </button>

          {/* Botón 6: Reportes DGII */}
          <button
            type="button"
            onClick={() => setCurrentView("reportes-dgii")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "reportes-dgii"
                ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/25 scale-[1.01]"
                : "bg-rose-50/90 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span className="truncate">5. Reportes 606/607/608</span>
          </button>

          {/* Botón 7: Catálogos & Errores */}
          <button
            type="button"
            onClick={() => setCurrentView("catalogos-errores")}
            className={`h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border cursor-pointer shadow-2xs ${
              currentView === "catalogos-errores"
                ? "bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/25 scale-[1.01]"
                : "bg-teal-50/90 hover:bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">6. Catálogos & Errores DGII</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 0: HUB PRINCIPAL DEL CENTRO FISCAL                                   */}
      {/* ========================================================================= */}
      {currentView === "hub" && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ventas Fiscales Aceptadas</p>
                <h4 className="text-2xl font-bold font-display mt-1 text-foreground">
                  {formatRD(metrics.totalFiscalAmount)}
                </h4>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {metrics.totalAccepted} comprobantes en DGII
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total e-CF Emitidos</p>
                <h4 className="text-2xl font-bold font-display mt-1 text-foreground">
                  {metrics.totalEmitted}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {metrics.totalPending} pendientes · {metrics.totalRejected} rechazados
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck className="h-6 w-6" />
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secuencias e-NCF</p>
                <h4 className="text-2xl font-bold font-display mt-1 text-foreground">
                  {metrics.availableSeqsCount} disp.
                </h4>
                <p className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${metrics.lowSeqsAlert ? "text-amber-600" : "text-emerald-600"}`}>
                  {metrics.lowSeqsAlert ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  {metrics.lowSeqsAlert ? "Alertas de agotamiento activas" : "Rangos fiscales óptimos"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6" />
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas de Crédito (E34)</p>
                <h4 className="text-2xl font-bold font-display mt-1 text-foreground">
                  {metrics.creditNotesCount}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Ajustes y anulaciones fiscales
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Undo2 className="h-6 w-6" />
              </div>
            </Card>
          </div>

          {/* TABLA DE ACTIVIDAD FISCAL RECIENTE */}
          <Card className="p-6 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold font-display text-foreground">Actividad Fiscal Reciente</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos comprobantes electrónicos emitidos en el negocio.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView("auditoria")}
                className="rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 hover:bg-slate-50"
              >
                Ver todos los emitidos ➔
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">e-NCF</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Receptor / Cliente</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-center">Estado DGII</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sentDocuments.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{doc.encf}</td>
                      <td className="px-4 py-3 font-medium">
                        <Badge variant="outline" className="text-[10px] font-bold bg-white">
                          {doc.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{doc.buyerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{doc.buyerRnc}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatRD(doc.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={`text-[10px] font-bold ${
                            doc.status === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAuditLive(doc)}
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 text-[#1B4B73] border border-[#1B4B73]/30 shadow-2xs gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#1B4B73]" />
                          <span>Auditar</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sentDocuments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No hay comprobantes electrónicos emitidos todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 1: AUDITORÍA e-CF EN VIVO                                           */}
      {/* ========================================================================= */}
      {currentView === "auditoria" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" /> Auditoría y Trazabilidad e-CF (DGII)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consulta en tiempo real del ciclo de vida de cada comprobante ante EF2 y la DGII.
              </p>
            </div>
            <Button
              onClick={handleGlobalSync}
              disabled={isSyncingGlobal}
              size="sm"
              className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGlobal ? "animate-spin" : ""}`} />
              Reconciliar con DGII
            </Button>
          </div>

          {/* Filtros de búsqueda con fondo blanco estricto */}
          <Card className="p-4 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-NCF, Cliente o RNC..."
                value={searchAudit}
                onChange={(e) => {
                  setSearchAudit(e.target.value);
                  setPageAudit(1);
                }}
                className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground shrink-0">Tipo:</Label>
              <select
                value={filterTypeAudit}
                onChange={(e) => {
                  setFilterTypeAudit(e.target.value);
                  setPageAudit(1);
                }}
                className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium shadow-2xs"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="E31">E31 - Crédito Fiscal</option>
                <option value="E32">E32 - Consumidor Final</option>
                <option value="E34">E34 - Nota de Crédito</option>
                <option value="E41">E41 - Compras</option>
                <option value="E43">E43 - Gastos Menores</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground shrink-0">Estado:</Label>
              <select
                value={filterStatusAudit}
                onChange={(e) => {
                  setFilterStatusAudit(e.target.value);
                  setPageAudit(1);
                }}
                className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium shadow-2xs"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACCEPTED">ACCEPTED (Aprobado)</option>
                <option value="REJECTED">REJECTED (Rechazado)</option>
                <option value="REGISTERED">REGISTERED (Pendiente)</option>
              </select>
            </div>
          </Card>

          {/* Tabla de comprobantes */}
          <Card className="rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3.5 text-left">e-NCF</th>
                    <th className="px-4 py-3.5 text-left">Tipo</th>
                    <th className="px-4 py-3.5 text-left">Receptor / RNC</th>
                    <th className="px-4 py-3.5 text-center">Fecha Emisión</th>
                    <th className="px-4 py-3.5 text-right">Monto Total</th>
                    <th className="px-4 py-3.5 text-center">Estado DGII</th>
                    <th className="px-4 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedAuditDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-primary whitespace-nowrap">
                        {doc.encf}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-bold font-mono bg-white">
                          {doc.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground truncate max-w-[200px]">{doc.buyerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{doc.buyerRnc}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString("es-DO")}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {formatRD(doc.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Badge
                          className={`text-[10px] font-bold ${
                            doc.status === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botón Auditar Live */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAuditLive(doc)}
                            className="h-8 px-2.5 rounded-xl text-xs font-bold bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 text-[#1B4B73] border border-[#1B4B73]/30 shadow-2xs gap-1 transition-all cursor-pointer"
                            title="Auditar estado en EF2/DGII"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#1B4B73]" />
                            <span>Auditar</span>
                          </Button>

                          {/* PDF */}
                          {doc.pdfUrl && (
                            <a
                              href={doc.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 w-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-2xs transition-all"
                              title="Ver Representación Gráfica (PDF)"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* QR */}
                          {doc.qrContent && (
                            <button
                              type="button"
                              onClick={() => setQrModalDoc(doc)}
                              className="h-8 w-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
                              title="Ver Código QR DGII"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Emitir Nota de Crédito */}
                          {doc.status === "ACCEPTED" && doc.type !== "E34" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceForNC(doc);
                                setShowNewNCModal(true);
                              }}
                              className="h-7 px-2 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-50"
                              title="Emitir Nota de Crédito E34 para esta factura"
                            >
                              <Undo2 className="h-3 w-3 mr-1" /> E34
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedAuditDocs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                        No se encontraron comprobantes fiscales con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between p-3.5 border-t border-border bg-white dark:bg-slate-900">
              <span className="text-xs text-muted-foreground">
                Página {pageAudit} de {totalPagesAudit} ({filteredAuditDocs.length} comprobantes)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageAudit === 1}
                  onClick={() => setPageAudit((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg bg-white border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageAudit >= totalPagesAudit}
                  onClick={() => setPageAudit((p) => Math.min(totalPagesAudit, p + 1))}
                  className="h-8 text-xs font-bold rounded-lg bg-white border-slate-200"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SECUENCIAS Y RANGOS e-NCF                                        */}
      {/* ========================================================================= */}
      {currentView === "secuencias" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" /> Secuencias y Rangos e-NCF
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Administración de rangos autorizados por la DGII, alertas de agotamiento y sincronización con EF2.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  setIsSyncingSeqs(true);
                  try {
                    await syncSequencesEF2(tenant.id);
                    queryClient.invalidateQueries({ queryKey: ["ecf-sequences", tenant.id] });
                    toast.success("Secuencias sincronizadas con EF2 API ✓");
                  } catch (e: any) {
                    toast.error(e.message || "Error al sincronizar secuencias");
                  } finally {
                    setIsSyncingSeqs(false);
                  }
                }}
                disabled={isSyncingSeqs}
                size="sm"
                variant="outline"
                className="rounded-xl font-bold border-slate-200 bg-white text-blue-700 hover:bg-slate-50 text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSeqs ? "animate-spin" : ""}`} />
                Sincronizar EF2
              </Button>

              <Button
                onClick={() => setShowNewSeqModal(true)}
                size="sm"
                className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white text-xs gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Añadir Nuevo Rango DGII
              </Button>
            </div>
          </div>

          {/* Grid de Secuencias Activas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rawSequences.map((seq) => {
              const currentVal = seq.valor_actual || 0;
              const totalRange = Math.max(1, seq.valor_final - seq.valor_inicial + 1);
              const used = Math.max(0, currentVal - seq.valor_inicial + 1);
              const remaining = Math.max(0, seq.valor_final - currentVal);
              const percent = Math.min(100, Math.round((used / totalRange) * 100));
              const threshold = seq.alerta_limite ?? 50;
              const isLow = remaining <= threshold;

              return (
                <Card key={seq.id} className="p-5 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">{seq.tipo_ecf}</span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white">
                          {NCF_NOMBRES[seq.tipo_ecf] || "e-CF"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Rango: {seq.tipo_ecf}{String(seq.valor_inicial).padStart(8, "0")} ➔ {seq.tipo_ecf}{String(seq.valor_final).padStart(8, "0")}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] font-bold ${
                        isLow ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {remaining} disp.
                    </Badge>
                  </div>

                  {/* Barra de progreso de consumo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="text-muted-foreground">Uso: {percent}% ({used} emitidos)</span>
                      <span className="text-muted-foreground font-mono">Actual: {seq.tipo_ecf}{String(currentVal).padStart(8, "0")}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Vencimiento DGII: {seq.expiration_date ? new Date(seq.expiration_date).toLocaleDateString("es-DO") : "Sin límite (E32)"}</span>
                    <span className="text-[11px]">Alerta en: {threshold}</span>
                  </div>
                </Card>
              );
            })}
            {rawSequences.length === 0 && (
              <div className="col-span-2 py-12 text-center text-muted-foreground border border-dashed rounded-2xl bg-white dark:bg-slate-900">
                No hay secuencias e-NCF registradas. Haz clic en "Sincronizar EF2" o "Añadir Nuevo Rango DGII".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: NOTAS DE CRÉDITO Y DÉBITO (E34 / E33)                             */}
      {/* ========================================================================= */}
      {currentView === "notas-credito" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-purple-600" /> Notas de Crédito & Débito (E34 / E33)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Emisión de comprobantes para devoluciones, correcciones y anulaciones fiscales ante la DGII.
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedInvoiceForNC(null);
                setShowNewNCModal(true);
              }}
              size="sm"
              className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white text-xs gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Emitir Nota de Crédito (E34)
            </Button>
          </div>

          <Card className="rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/70 bg-white dark:bg-slate-900 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial de Notas de Crédito Emitidas</h4>
              <span className="text-xs font-bold text-purple-700">{metrics.creditNotesCount} emitidas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 border-b border-border text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">e-NCF Nota</th>
                    <th className="px-4 py-3 text-left">Cliente / RNC</th>
                    <th className="px-4 py-3 text-center">Fecha</th>
                    <th className="px-4 py-3 text-right">Monto Rebajado</th>
                    <th className="px-4 py-3 text-center">Estado DGII</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sentDocuments
                    .filter((d) => d.type === "E34" || d.encf.startsWith("E34"))
                    .map((nc) => (
                      <tr key={nc.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-purple-700">{nc.encf}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{nc.buyerName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{nc.buyerRnc}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(nc.createdAt).toLocaleDateString("es-DO")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatRD(nc.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                            {nc.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAuditLive(nc)}
                            className="h-8 px-3 rounded-xl text-xs font-bold bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 text-[#1B4B73] border border-[#1B4B73]/30 shadow-2xs gap-1.5 transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#1B4B73]" />
                            <span>Auditar</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {metrics.creditNotesCount === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No se han emitido notas de crédito todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: GASTOS MENORES (E43) Y COMPRAS INFORMALES (E41)                  */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* VISTA 4: GASTOS MENORES (E43) Y COMPRAS INFORMALES (E41)                  */}
      {/* ========================================================================= */}
      {currentView === "gastos-compras" && (
        <div className="space-y-6">
          {/* Formulario Superior: Emisión de Gasto / Compra Fiscal */}
          <Card className="p-6 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-600" /> Emitir Gasto / Compra Fiscal
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Genera comprobantes E41 o E43 para justificar egresos deducibles ante la DGII.
                </p>
              </div>

              {/* Selector de Tipo E43 / E41 con colores de fondo definidos */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType("E43");
                    setExpenseFilter("E43");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    expenseType === "E43"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs"
                      : "bg-white/80 hover:bg-white text-slate-600 border border-transparent"
                  }`}
                >
                  E43 · Gastos Menores
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType("E41");
                    setExpenseFilter("E41");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    expenseType === "E41"
                      ? "bg-blue-50 text-blue-800 border border-blue-300 shadow-xs"
                      : "bg-white/80 hover:bg-white text-slate-600 border border-transparent"
                  }`}
                >
                  E41 · Compras / Servicios
                </button>
              </div>
            </div>

            {/* Campos del Formulario: perfectamente alineados con el botón */}
            {expenseType === "E43" ? (
              /* Layout E43: Todo en una sola fila alineada */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-1">
                <div className="md:col-span-6 space-y-1.5">
                  <Label className="text-xs font-bold">Concepto o Descripción *</Label>
                  <Input
                    placeholder="Ej. Botellones de agua, fundas, detergente, insumos de limpieza..."
                    value={expenseConcept}
                    onChange={(e) => setExpenseConcept(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs font-bold">Monto Total (RD$) *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(formatAmountInput(e.target.value))}
                    className="h-10 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <Button
                    onClick={handleEmitExpense}
                    disabled={isEmittingExpense}
                    className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isEmittingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Emitir Comprobante E43</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Layout E41: 2 filas perfectamente alineadas */
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6 space-y-1.5">
                    <Label className="text-xs font-bold">Concepto o Descripción del Servicio *</Label>
                    <Input
                      placeholder="Ej. Reparación y mantenimiento de lavadora industrial..."
                      value={expenseConcept}
                      onChange={(e) => setExpenseConcept(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold">Monto Total (RD$) *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(formatAmountInput(e.target.value))}
                      className="h-10 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold">RNC / Cédula Proveedor *</Label>
                    <Input
                      placeholder="Ej. 00112345678"
                      value={expenseSupplierRnc}
                      onChange={(e) => setExpenseSupplierRnc(e.target.value)}
                      className="h-10 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5 space-y-1.5">
                    <Label className="text-xs font-bold">Nombre del Proveedor / Técnico</Label>
                    <Input
                      placeholder="Ej. Juan Pérez (Técnico Independiente)"
                      value={expenseSupplierName}
                      onChange={(e) => setExpenseSupplierName(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                    />
                  </div>

                  <div className="md:col-span-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 h-10 flex items-center">
                    <span>
                      <strong>Retenciones DGII:</strong> 100% ITBIS + 10% ISR
                    </span>
                  </div>

                  <div className="md:col-span-3">
                    <Button
                      onClick={handleEmitExpense}
                      disabled={isEmittingExpense}
                      className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 gap-1.5 shadow-sm cursor-pointer"
                    >
                      {isEmittingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span>Emitir Comprobante E41</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Historial Inferior: Tabla de Comprobantes de Gasto a Ancho Completo */}
          {(() => {
            const allExpenseDocs = sentDocuments.filter((d) => d.type === "E41" || d.type === "E43" || d.encf?.startsWith("E41") || d.encf?.startsWith("E43"));
            const e43Docs = allExpenseDocs.filter((d) => d.type === "E43" || d.encf?.startsWith("E43"));
            const e41Docs = allExpenseDocs.filter((d) => d.type === "E41" || d.encf?.startsWith("E41"));

            const displayedDocs = expenseFilter === "E43" 
              ? e43Docs 
              : expenseFilter === "E41" 
                ? e41Docs 
                : allExpenseDocs;

            return (
              <Card className="p-6 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold font-display text-foreground">
                      {expenseFilter === "E43" 
                        ? "Comprobantes de Gastos Menores Emitidos (E43)" 
                        : expenseFilter === "E41" 
                          ? "Comprobantes de Compras Emitidos (E41)" 
                          : "Comprobantes de Egresos Emitidos (E41 / E43)"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Historial para deducción en declaración jurada DGII (registrados desde /gastos o emitidos en /fiscal).
                    </p>
                  </div>

                  {/* Filter Pills para alternar libremente */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpenseFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        expenseFilter === "ALL"
                          ? "bg-white dark:bg-slate-900 text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Todos ({allExpenseDocs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseFilter("E43")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        expenseFilter === "E43"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      E43 · Gastos ({e43Docs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseFilter("E41")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        expenseFilter === "E41"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      E41 · Compras ({e41Docs.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3 text-left">e-NCF</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Concepto / Proveedor</th>
                        <th className="px-4 py-3 text-left">RNC / Cédula</th>
                        <th className="px-4 py-3 text-right">Monto Total</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-center">Auditar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {displayedDocs.map((exp) => {
                        const isE41 = exp.type === "E41" || exp.encf?.startsWith("E41");
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-bold text-emerald-700">{exp.encf}</td>
                            <td className="px-4 py-3 font-bold">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isE41
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {isE41 ? "E41 · Compra" : "E43 · Gasto"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{exp.buyerName}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{exp.buyerRnc || "-"}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                              {formatRD(exp.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                {exp.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAuditLive(exp)}
                                className="h-8 px-3 rounded-xl text-xs font-bold bg-[#1B4B73]/10 hover:bg-[#1B4B73]/20 text-[#1B4B73] border border-[#1B4B73]/30 shadow-2xs gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-[#1B4B73]" />
                                <span>Auditar</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedDocs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            No se han emitido comprobantes {expenseFilter === "E43" ? "de gastos menores (E43)" : expenseFilter === "E41" ? "de compras (E41)" : "de compras o gastos"} aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 5: REPORTES TRIBUTARIOS DGII (606 / 607 / 608)                       */}
      {/* ========================================================================= */}
      {currentView === "reportes-dgii" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5 text-rose-600" /> Reportes Tributarios DGII (606 / 607 / 608)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exportador oficial de archivos de texto (.txt) para la Oficina Virtual de la DGII.
              </p>
            </div>

            {/* Selector de Período */}
            <div className="flex items-center gap-2">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="h-10 px-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold shadow-2xs"
              >
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>

              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="h-10 px-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold font-mono shadow-2xs"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          {/* Resumen del Período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Formato 607 (Ventas)</p>
                <h4 className="text-xl font-bold font-display mt-1 text-foreground">
                  {formatRD(reportData.totalVentas)}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{reportData.rows607.length} comprobantes emitidos</p>
              </div>
              <Button
                onClick={() => downloadReportTXT("607")}
                size="sm"
                className="rounded-xl font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white text-xs gap-1"
              >
                <Download className="h-3.5 w-3.5" /> TXT 607
              </Button>
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Formato 606 (Compras y Gastos)</p>
                <h4 className="text-xl font-bold font-display mt-1 text-foreground">
                  {formatRD(reportData.totalCompras)}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{reportData.rows606.length} registros</p>
              </div>
              <Button
                onClick={() => downloadReportTXT("606")}
                size="sm"
                className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
              >
                <Download className="h-3.5 w-3.5" /> TXT 606
              </Button>
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Formato 608 (Anulados)</p>
                <h4 className="text-xl font-bold font-display mt-1 text-foreground">
                  {reportData.totalAnulados} anulados
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Notas de crédito y cancelaciones</p>
              </div>
              <Button
                onClick={() => downloadReportTXT("608")}
                size="sm"
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1"
              >
                <Download className="h-3.5 w-3.5" /> TXT 608
              </Button>
            </Card>
          </div>

          {/* Selector de Pestaña de Reporte */}
          <div className="flex items-center gap-2 border-b border-border/70 pb-2">
            <button
              type="button"
              onClick={() => setReportTab("607")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportTab === "607" ? "bg-[#1B4B73] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Vista Previa 607 (Ventas)
            </button>
            <button
              type="button"
              onClick={() => setReportTab("606")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportTab === "606" ? "bg-[#1B4B73] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Vista Previa 606 (Gastos)
            </button>
            <button
              type="button"
              onClick={() => setReportTab("608")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportTab === "608" ? "bg-[#1B4B73] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Vista Previa 608 (Anulados)
            </button>
          </div>

          {/* Tabla de Vista Previa */}
          <Card className="rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">e-NCF</th>
                    <th className="px-4 py-3 text-left">RNC / Cédula</th>
                    <th className="px-4 py-3 text-left">Nombre / Razón Social</th>
                    <th className="px-4 py-3 text-center">Fecha</th>
                    <th className="px-4 py-3 text-right">Monto Facturado</th>
                    <th className="px-4 py-3 text-right">ITBIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(reportTab === "607" ? reportData.rows607 : reportTab === "606" ? reportData.rows606 : reportData.rows608).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{r.encf}</td>
                      <td className="px-4 py-3 font-mono">{r.buyerRnc}</td>
                      <td className="px-4 py-3 font-bold">{r.buyerName}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("es-DO")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatRD(r.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatRD(r.totalItbis)}</td>
                    </tr>
                  ))}
                  {(reportTab === "607" ? reportData.rows607 : reportTab === "606" ? reportData.rows606 : reportData.rows608).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No hay registros en este formato para el período {reportData.period}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 6: CATÁLOGOS Y DICCIONARIO DE ERRORES DGII                            */}
      {/* ========================================================================= */}
      {currentView === "catalogos-errores" && (
        <div className="space-y-6">
          <div className="pb-2 border-b border-border/70">
            <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" /> Diccionario de Errores & Catálogos Oficiales DGII
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Guía de referencia rápida de códigos técnicos de la DGII y cómo resolver rechazos impositivos.
            </p>
          </div>

          {/* Buscador de Errores DGII con fondo blanco estricto */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold font-display">Buscador de Errores de Validación y Rechazo DGII</h4>
              <span className="text-xs text-muted-foreground font-mono">{filteredErrors.length} códigos registrados</span>
            </div>
            <div className="relative max-w-lg">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 145, 3, 1209) o mensaje..."
                value={searchErrorQuery}
                onChange={(e) => setSearchErrorQuery(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredErrors.map((err, idx) => (
                <Card key={idx} className="p-4 rounded-2xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs select-none">
                        Código {err.codigo}
                      </span>
                      <h5 className="font-bold text-xs text-foreground">{err.titulo}</h5>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{err.causa}</p>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Solución recomendada:</strong> {err.solucion}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Catálogo de Medios de Pago DGII */}
          <div className="space-y-3 pt-4 border-t border-border/70">
            <h4 className="text-sm font-bold font-display">Catálogo Oficial de Medios de Pago (FormaPago DGII)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DGII_MEDIOS_PAGO.map((mp) => (
                <Card key={mp.codigo} className="p-3.5 rounded-xl border-slate-200/80 bg-white dark:bg-slate-900 shadow-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 text-[#1B4B73] border border-blue-200 shadow-2xs select-none">
                      {mp.codigo}
                    </span>
                    <span className="font-bold text-xs text-foreground">{mp.nombre}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{mp.descripcion}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDITORÍA EN VIVO (DIAGNÓSTICO DGII REDISEÑADO)                   */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL: AUDITORÍA EN VIVO (DIAGNÓSTICO DGII COMPACTO)                     */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedAuditDetail} onOpenChange={(open) => !open && setSelectedAuditDetail(null)}>
        <DialogContent className="max-w-[420px] sm:max-w-[430px] p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 shadow-xl space-y-3">
          <DialogHeader className="text-left space-y-1 pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-bold font-display text-foreground">
                  Auditoría e-CF en Vivo
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAuditDetail?.encf) {
                        navigator.clipboard.writeText(selectedAuditDetail.encf);
                        toast.success(`e-NCF ${selectedAuditDetail.encf} copiado ✓`);
                      }
                    }}
                    className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer select-none group"
                    title="Haz clic para copiar el e-NCF"
                  >
                    <span>{selectedAuditDetail?.encf}</span>
                    <Copy className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                  </button>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    {selectedAuditDetail?.buyerName}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2">
            {loadingAuditLive ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Consultando estado en tiempo real ante la DGII y EF2...</span>
              </div>
            ) : (
              <>
                {/* 1. Estado Fiscal DGII */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Estado DGII
                  </span>
                  <Badge
                    className={`text-[10px] font-bold uppercase ${
                      selectedAuditDetail?.status === "ACCEPTED" || selectedAuditDetail?.status === "accepted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedAuditDetail?.status === "REJECTED" || selectedAuditDetail?.status === "rejected"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {selectedAuditDetail?.status === "ACCEPTED" ? "Aceptado por DGII" : selectedAuditDetail?.status}
                  </Badge>
                </div>

                {/* 2. Track ID DGII */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                    <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    Track ID
                  </span>
                  {selectedAuditDetail?.trackId ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAuditDetail.trackId);
                        toast.success("Track ID copiado ✓");
                      }}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 cursor-pointer transition-all shadow-2xs group truncate max-w-[210px]"
                      title="Haz clic para copiar el Track ID"
                    >
                      <span className="truncate">{selectedAuditDetail.trackId}</span>
                      <Copy className="h-2.5 w-2.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    </button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Generado por EF2
                    </Badge>
                  )}
                </div>

                {/* 3. Firma Digital & Seguridad */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    Cód. Seguridad
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                      {selectedAuditDetail?.securityCode || "AsCmYR"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(selectedAuditDetail?.createdAt || Date.now()).toLocaleDateString("es-DO")}
                    </span>
                  </div>
                </div>

                {/* 4. Documentos en Bóveda */}
                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Acciones
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {selectedAuditDetail?.pdfUrl && (
                      <a
                        href={selectedAuditDetail.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                      >
                        <Download className="h-3 w-3 text-blue-600" />
                        <span>PDF</span>
                      </a>
                    )}
                    {selectedAuditDetail?.xmlUrl && (
                      <a
                        href={selectedAuditDetail.xmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                      >
                        <Download className="h-3 w-3 text-emerald-600" />
                        <span>XML</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setQrModalDoc(selectedAuditDetail);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
                    >
                      <QrCode className="h-3 w-3 text-purple-600" />
                      <span>Timbre QR</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-1">
            <Button
              onClick={() => setSelectedAuditDetail(null)}
              className="w-full rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white h-8.5 shadow-xs cursor-pointer"
            >
              Cerrar Auditoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CÓDIGO QR DGII (TIMBRE FISCAL COMPACTO)                            */}
      {/* ========================================================================= */}
      <Dialog open={!!qrModalDoc} onOpenChange={(open) => !open && setQrModalDoc(null)}>
        <DialogContent className="max-w-[330px] sm:max-w-[340px] p-5 rounded-2xl text-center bg-white dark:bg-slate-900 shadow-lg">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-bold font-display flex items-center justify-center gap-1.5 text-foreground">
              <QrCode className="h-4 w-4 text-primary" /> Timbre Fiscal QR (DGII)
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground leading-tight">
              Escanea para validar este comprobante en la DGII
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex flex-col items-center justify-center space-y-2.5">
            {/* Contenedor del QR Compacto y Nítido */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center">
              {qrModalDoc && (
                <QRCodeSVG
                  value={getDgiiValidationUrl(qrModalDoc)}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            {/* Datos del Comprobante con clic para copiar y hover limpio */}
            <div className="space-y-1">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (qrModalDoc?.encf) {
                      navigator.clipboard.writeText(qrModalDoc.encf);
                      toast.success(`e-NCF ${qrModalDoc.encf} copiado al portapapeles ✓`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 font-mono font-bold text-xs px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100/90 active:scale-95 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer select-none group"
                  title="Haz clic para copiar el e-NCF"
                >
                  <span>{qrModalDoc?.encf}</span>
                  <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                {qrModalDoc?.buyerName} · <strong className="text-foreground">{formatRD(qrModalDoc?.totalAmount || 0)}</strong>
              </p>
              {qrModalDoc?.securityCode && qrModalDoc.securityCode !== "null" && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  Cód. Seguridad: <span className="font-bold text-foreground">{qrModalDoc.securityCode}</span>
                </p>
              )}
            </div>

            {/* Botones de acción limpios */}
            <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const url = getDgiiValidationUrl(qrModalDoc);
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace DGII copiado ✓");
                }}
                className="rounded-xl text-[11px] font-bold bg-white border-slate-200 hover:bg-slate-50 gap-1 h-8 px-2 cursor-pointer shadow-2xs"
              >
                <Copy className="h-3 w-3 text-primary" />
                <span>Copiar Enlace</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const url = getDgiiValidationUrl(qrModalDoc);
                  window.open(url, "_blank");
                }}
                className="rounded-xl text-[11px] font-bold bg-white border-slate-200 hover:bg-slate-50 gap-1 h-8 px-2 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="h-3 w-3 text-blue-600" />
                <span>Abrir DGII</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button onClick={() => setQrModalDoc(null)} className="w-full rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 h-8">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVA SECUENCIA DGII                                        */}
      {/* ========================================================================= */}
      <Dialog open={showNewSeqModal} onOpenChange={setShowNewSeqModal}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" /> Registrar Nuevo Rango e-NCF
            </DialogTitle>
            <DialogDescription>
              Ingresa el rango autorizado por la DGII. EF2 validará la continuidad automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold">Tipo de e-CF *</Label>
              <select
                value={newSeqType}
                onChange={(e) => setNewSeqType(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold mt-1 shadow-2xs"
              >
                <option value="E31">E31 - Factura de Crédito Fiscal</option>
                <option value="E32">E32 - Factura de Consumo Final</option>
                <option value="E33">E33 - Nota de Débito</option>
                <option value="E34">E34 - Nota de Crédito</option>
                <option value="E41">E41 - Comprobante de Compras</option>
                <option value="E43">E43 - Gastos Menores</option>
                <option value="E44">E44 - Regímenes Especiales</option>
                <option value="E45">E45 - Gubernamental</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Desde (Número inicial) *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="1"
                  value={newSeqFrom}
                  onChange={(e) => setNewSeqFrom(formatIntegerInput(e.target.value))}
                  className="mt-1 h-10 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Hasta (Número final) *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="1,000"
                  value={newSeqTo}
                  onChange={(e) => setNewSeqTo(formatIntegerInput(e.target.value))}
                  className="mt-1 h-10 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                />
              </div>
            </div>

            {newSeqType !== "E32" && (
              <div>
                <Label className="text-xs font-bold">Fecha de Vencimiento DGII *</Label>
                <Input
                  type="date"
                  value={newSeqExp}
                  onChange={(e) => setNewSeqExp(e.target.value)}
                  className="mt-1 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowNewSeqModal(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSequence}
              disabled={isSavingSeq}
              className="rounded-xl text-xs font-bold bg-[#1B4B73] hover:bg-[#143a59] text-white gap-1.5"
            >
              {isSavingSeq ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Guardar en EF2
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EMITIR NOTA DE CRÉDITO (E34)                                       */}
      {/* ========================================================================= */}
      <Dialog open={showNewNCModal} onOpenChange={setShowNewNCModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-purple-600" /> Emitir Nota de Crédito (E34)
            </DialogTitle>
            <DialogDescription>
              Genera una nota de crédito oficial vinculada a una factura previa emitida ante la DGII.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedInvoiceForNC ? (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1">
                <div>
                  <strong>Factura afectada:</strong> <span className="font-mono font-bold text-purple-800">{selectedInvoiceForNC.encf}</span>
                </div>
                <div><strong>Cliente:</strong> {selectedInvoiceForNC.buyerName} ({selectedInvoiceForNC.buyerRnc})</div>
                <div><strong>Monto Original:</strong> {formatRD(selectedInvoiceForNC.totalAmount)}</div>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-bold">Selecciona la Factura Original a Afectar *</Label>
                <select
                  onChange={(e) => {
                    const found = sentDocuments.find((d) => d.id === e.target.value);
                    setSelectedInvoiceForNC(found || null);
                  }}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold mt-1 shadow-2xs"
                >
                  <option value="">-- Selecciona una factura --</option>
                  {sentDocuments
                    .filter((d) => d.status === "ACCEPTED" && d.type !== "E34")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.encf} - {d.buyerName} ({formatRD(d.totalAmount)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold">Código de Modificación DGII *</Label>
              <select
                value={ncModCode}
                onChange={(e) => setNcModCode(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold mt-1 shadow-2xs"
              >
                <option value="1">1 · Cancelación total de la factura</option>
                <option value="2">2 · Corrección de texto / error de escritura</option>
                <option value="3">3 · Devolución de bienes / prendas</option>
                <option value="4">4 · Descuento / bonificación aplicada</option>
                <option value="5">5 · Cambio de precio</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold">Razón o Motivo del Ajuste *</Label>
              <Textarea
                placeholder="Ej. Prenda no pudo ser desmanchada, devolución solicitada por cliente..."
                value={ncReason}
                onChange={(e) => setNcReason(e.target.value)}
                rows={3}
                className="mt-1 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowNewNCModal(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleEmitCreditNote}
              disabled={isEmittingNC || !selectedInvoiceForNC}
              className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {isEmittingNC ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Emitir Nota de Crédito en DGII
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
