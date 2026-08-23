import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  CloudOff,
  FileClock,
  Loader2,
  RefreshCw,
  RotateCw,
  Send,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/klynn/PageHeader";
import { GlobalPageLoader } from "@/components/klynn/GlobalPageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { offlineDB, type SyncOutboxItem } from "@/lib/offline-db";
import { syncManager } from "@/lib/sync-manager";
import { sincronizarEstadoECF } from "@/lib/fiscal";
import { formatRD, isModuleEnabled } from "@/lib/storage";
import { useECFDocuments, useOrdenes, usePlans } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/t/$slug/fiscal-pendientes")({
  component: ComprobantesPendientesPage,
});

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ComprobantesPendientesPage() {
  const user = useRequireAuth();
  const tenant = user?.tenant;
  const tenantId = tenant?.id || "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } = useOrdenes(tenantId);
  const { data: documents = [], isLoading: loadingDocuments, refetch: refetchDocuments } = useECFDocuments(tenantId);
  const { data: plans = [] } = usePlans();
  const [outbox, setOutbox] = useState<SyncOutboxItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  const activePlan = plans.find((plan) => plan.id === tenant?.plan_id);
  const hasFiscalModule = isModuleEnabled(tenant || null, "facturacion_fiscal", activePlan);

  const loadQueue = useCallback(async () => {
    if (!tenantId) return;
    setLoadingQueue(true);
    try {
      const items = await offlineDB.getAll<SyncOutboxItem>("sync_outbox");
      setOutbox(items.filter((item) =>
        item.tenant_id === tenantId
        && item.table_name === "ordenes"
        && (item.payload?.ecf_status === "PENDING_OFFLINE_TRANSMISSION"
          || String(item.payload?.ecf_security_code || "").startsWith("SBX")),
      ));
    } finally {
      setLoadingQueue(false);
    }
  }, [tenantId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), refetchOrders(), refetchDocuments()]);
  }, [loadQueue, refetchDocuments, refetchOrders]);

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("klynn-outbox-updated", handleUpdate);
    window.addEventListener("klynn-sync-completed", handleUpdate);
    window.addEventListener("klynn-order-fiscal-updated", handleUpdate);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("klynn-outbox-updated", handleUpdate);
      window.removeEventListener("klynn-sync-completed", handleUpdate);
      window.removeEventListener("klynn-order-fiscal-updated", handleUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadQueue]);

  const ordersById = useMemo(() => new Map(orders.map((order: any) => [order.id, order])), [orders]);
  const pendingRemote = useMemo(() => documents.filter((doc: any) =>
    doc.status === "pending" && (doc.track_id || doc.pronesoft_id),
  ), [documents]);
  const queuedOrderIds = useMemo(() => new Set(outbox.map((item) => item.payload?.id || item.id)), [outbox]);
  const trackedOrderIds = useMemo(() => new Set(pendingRemote.map((doc: any) => doc.order_id).filter(Boolean)), [pendingRemote]);
  const needsAttention = useMemo(() => orders.filter((order: any) => {
    const status = String(order.ecf_status || "").toUpperCase();
    return (status === "ERROR" || status === "PENDING_OFFLINE_TRANSMISSION")
      && !queuedOrderIds.has(order.id)
      && !trackedOrderIds.has(order.id);
  }), [orders, queuedOrderIds, trackedOrderIds]);

  async function retryQueueItem(item: SyncOutboxItem) {
    if (!online) {
      toast.warning("Todavía no hay conexión. La pre-factura permanece guardada en este dispositivo.");
      return;
    }
    setWorkingId(item.id);
    try {
      await offlineDB.retryOutboxItem(item.id);
      const result = await syncManager.processQueue(tenantId);
      await refreshAll();
      if (result.failed > 0) toast.error("Pronesoft no pudo procesar el comprobante. Se conservó en la cola para reintentar.");
      else toast.success("Sincronización ejecutada. Consulta el estado DGII si quedó registrado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo reintentar la sincronización.");
    } finally {
      setWorkingId(null);
    }
  }

  async function syncAll() {
    if (!online) {
      toast.warning("No hay conexión a internet.");
      return;
    }
    setSyncingAll(true);
    try {
      for (const item of outbox.filter((entry) => entry.status === "failed" || entry.status === "processing")) {
        await offlineDB.retryOutboxItem(item.id);
      }
      const result = await syncManager.processQueue(tenantId);
      await refreshAll();
      toast.info(`${result.synced} operación(es) sincronizada(s); ${result.failed} pendiente(s) con error.`);
    } finally {
      setSyncingAll(false);
    }
  }

  async function consultStatus(doc: any) {
    setWorkingId(doc.id);
    try {
      const updated = await sincronizarEstadoECF(tenantId, doc);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordenes", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["ecf-documents", tenantId] }),
      ]);
      const label = updated.status === "accepted" ? "aceptado"
        : updated.status === "rejected" ? "rechazado" : "pendiente";
      toast.info(`Pronesoft respondió: ${updated.encf} está ${label}.`);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo consultar el estado en Pronesoft.");
    } finally {
      setWorkingId(null);
    }
  }

  if (!user || tenant?.id === "__loading__" || loadingOrders || loadingDocuments) {
    return <GlobalPageLoader text="Cargando comprobantes pendientes..." />;
  }

  if (!hasFiscalModule) {
    return <Card className="p-8 text-center">El módulo fiscal no está habilitado para esta lavandería.</Card>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Comprobantes pendientes"
        description="Control de pre-facturas offline y documentos registrados que esperan respuesta de Pronesoft/DGII."
      >
        <div className="flex flex-wrap gap-2">
          <Badge className={online
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"}>
            {online ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <CloudOff className="mr-1 h-3.5 w-3.5" />}
            {online ? "En línea" : "Sin conexión"}
          </Badge>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate({ to: "/t/$slug/fiscal", params: { slug: tenant!.slug } })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Centro Fiscal
          </Button>
          <Button className="rounded-xl bg-[#1B4B73] hover:bg-[#143a59]" onClick={syncAll} disabled={!online || syncingAll || outbox.length === 0}>
            {syncingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar pendientes
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={CloudOff} label="Sin transmitir" value={outbox.length} tone="amber" />
        <SummaryCard icon={Clock3} label="Esperando DGII" value={pendingRemote.length} tone="blue" />
        <SummaryCard icon={AlertTriangle} label="Requieren atención" value={needsAttention.length} tone="red" />
      </div>

      <PendingSection
        title="Pre-facturas guardadas en este dispositivo"
        description="Todavía no poseen e-NCF, QR, firma ni código de seguridad. Reintentar utiliza la emisión oficial mediante el SDK de Pronesoft."
        emptyText={loadingQueue ? "Leyendo cola local..." : "No hay pre-facturas offline pendientes."}
      >
        {outbox.map((item) => {
          const order = item.payload || ordersById.get(item.id) || {};
          return (
            <PendingRow
              key={item.id}
              title={order.numero || `Orden ${item.id.slice(0, 8)}`}
              subtitle={`Guardada ${formatDate(item.timestamp)} · ${item.attempts || 0} intento(s)`}
              amount={order.total}
              status={item.status === "failed" ? "Error de sincronización" : item.status === "processing" ? "Procesando" : "Pendiente offline"}
              error={item.error_message}
              action={
                <Button size="sm" variant="outline" className="rounded-xl" disabled={!online || workingId === item.id} onClick={() => retryQueueItem(item)}>
                  {workingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Reintentar
                </Button>
              }
            />
          );
        })}
      </PendingSection>

      <PendingSection
        title="Registrados en Pronesoft"
        description="Pronesoft ya recibió estos documentos; aquí solo se consulta su estado. Nunca se vuelven a emitir desde este botón."
        emptyText="No hay documentos esperando respuesta DGII."
      >
        {pendingRemote.map((doc: any) => {
          const order: any = doc.order_id ? ordersById.get(doc.order_id) : undefined;
          return (
            <PendingRow
              key={doc.id}
              title={doc.encf || order?.numero || "e-CF registrado"}
              subtitle={`${order?.numero ? `Orden ${order.numero} · ` : ""}Enviado ${formatDate(doc.fecha_emision || doc.created_at)}`}
              amount={doc.monto_total}
              status="Validación DGII pendiente"
              action={
                <Button size="sm" variant="outline" className="rounded-xl" disabled={!online || workingId === doc.id} onClick={() => consultStatus(doc)}>
                  {workingId === doc.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                  Consultar estado
                </Button>
              }
            />
          );
        })}
      </PendingSection>

      <PendingSection
        title="Requieren atención"
        description="Errores sin una tarea local o un trackId verificable. No se reenvían automáticamente para evitar comprobantes duplicados."
        emptyText="No hay comprobantes que requieran intervención."
      >
        {needsAttention.map((order: any) => (
          <PendingRow
            key={order.id}
            title={order.numero || order.id}
            subtitle={order.ncf ? `e-NCF ${order.ncf}` : "No se asignó e-NCF"}
            amount={order.total}
            status={String(order.ecf_status || "ERROR")}
            error="Revise la configuración fiscal o el diagnóstico de Pronesoft antes de intentar una nueva emisión."
          />
        ))}
      </PendingSection>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "amber" | "blue" | "red" }) {
  const colors = tone === "amber" ? "bg-amber-50 text-amber-700 border-amber-200"
    : tone === "red" ? "bg-red-50 text-red-700 border-red-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <Card className="rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${colors}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div>
    </Card>
  );
}

function PendingSection({ title, description, emptyText, children }: { title: string; description: string; emptyText: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card className="rounded-3xl overflow-hidden">
      <div className="border-b bg-muted/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FileClock className="mt-0.5 h-5 w-5 text-[#1B4B73]" />
          <div><h2 className="font-bold text-lg">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
        </div>
      </div>
      <div className="divide-y">{hasChildren ? children : <p className="p-8 text-center text-sm text-muted-foreground">{emptyText}</p>}</div>
    </Card>
  );
}

function PendingRow({ title, subtitle, amount, status, error, action }: { title: string; subtitle: string; amount?: number; status: string; error?: string; action?: ReactNode }) {
  return (
    <div className="p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{title}</h3><Badge variant="outline">{status}</Badge></div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex items-center justify-between gap-4 lg:justify-end">
        {typeof amount === "number" && <span className="font-black whitespace-nowrap">{formatRD(amount)}</span>}
        {action}
      </div>
    </div>
  );
}
