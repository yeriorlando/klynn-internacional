import { useMemo, useState } from "react";
import {
  CircleCheck,
  Coins,
  Inbox,
  LayoutGrid,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Orden } from "@/lib/storage";
import { useCajaAbierta, useClientes, useOrdenes } from "@/hooks/use-queries";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CobrarOrdenDialog, PendienteCard } from "@/components/klynn/OrdenesPage";

type PendingStatus = "todos" | "RECIBIDA" | "EN_PROCESO" | "LISTA" | "EN_CAMINO";

interface PendingCollectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingCollectionsDialog({ open, onOpenChange }: PendingCollectionsDialogProps) {
  const user = useRequireAuth();
  const tenantId = user?.tenant.id ?? "";
  const queryClient = useQueryClient();
  const { data: ordenes = [] } = useOrdenes(tenantId);
  const { data: clientes = [] } = useClientes(tenantId);
  const { data: cajaAbierta } = useCajaAbierta(tenantId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PendingStatus>("todos");
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<Orden | null>(null);

  const pendientes = useMemo(
    () => ordenes
      .filter((orden) =>
        orden.saldo > 0 &&
        orden.metodo_pago === "PAGO_AL_RETIRAR" &&
        orden.estado !== "ENTREGADA" &&
        orden.estado !== "ANULADA" &&
        ["RECIBIDA", "EN_PROCESO", "LISTA", "EN_CAMINO"].includes(orden.estado)
      )
      .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en)),
    [ordenes]
  );

  const filtradas = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pendientes.filter((orden) => {
      if (status !== "todos" && orden.estado !== status) return false;
      if (!query) return true;

      const cliente = clientes.find((item) => item.id === orden.cliente_id);
      const nombre = cliente ? `${cliente.nombre} ${cliente.apellido || ""}`.toLowerCase() : "";
      const fecha = orden.creado_en ? new Date(orden.creado_en).toLocaleDateString("es-DO").toLowerCase() : "";
      const fechaLarga = orden.creado_en
        ? new Date(orden.creado_en).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" }).toLowerCase()
        : "";

      return orden.numero.toLowerCase().includes(query) ||
        nombre.includes(query) ||
        String(orden.total).includes(query) ||
        String(orden.saldo).includes(query) ||
        fecha.includes(query) ||
        fechaLarga.includes(query);
    });
  }, [clientes, pendientes, search, status]);

  const filters = [
    {
      value: "todos" as const,
      label: "Todas",
      count: pendientes.length,
      icon: LayoutGrid,
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      activeBg: "bg-[#2c4e82] text-white border-[#2c4e82] shadow-md",
    },
    {
      value: "RECIBIDA" as const,
      label: "Recibidas",
      count: pendientes.filter((orden) => orden.estado === "RECIBIDA").length,
      icon: Inbox,
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      activeBg: "bg-blue-600 text-white border-blue-600 shadow-md",
    },
    {
      value: "EN_PROCESO" as const,
      label: "En proceso",
      count: pendientes.filter((orden) => orden.estado === "EN_PROCESO").length,
      icon: RefreshCw,
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      activeBg: "bg-amber-500 text-white border-amber-500 shadow-md",
    },
    {
      value: "LISTA" as const,
      label: "Listas",
      count: pendientes.filter((orden) => orden.estado === "LISTA").length,
      icon: CircleCheck,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-md",
    },
    {
      value: "EN_CAMINO" as const,
      label: "En camino",
      count: pendientes.filter((orden) => orden.estado === "EN_CAMINO").length,
      icon: Truck,
      bg: "bg-purple-50 text-purple-700 border-purple-200",
      activeBg: "bg-purple-600 text-white border-purple-600 shadow-md",
    },
  ];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setOrdenSeleccionada(null);
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[min(86vh,800px)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[calc(100vw-2rem)] 2xl:max-w-[1680px] dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader className="relative shrink-0 overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary/[0.12] via-white to-emerald-50/80 px-4 py-3 pr-14 text-left dark:from-primary/25 dark:via-slate-950 dark:to-emerald-950/40 md:px-5 md:py-3.5">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Coins className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">Centro de cobros</p>
                  <DialogTitle className="mt-0.5 font-display text-xl font-black tracking-tight text-slate-950 dark:text-white">
                    Cobrar orden pendiente
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Busca una orden, selecciónala y registra el pago sin salir de Nueva orden.
                  </DialogDescription>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {pendientes.length} pendientes
              </span>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col bg-slate-50/70 p-3 dark:bg-slate-950 md:p-4">
            <Card className="flex shrink-0 flex-wrap items-center gap-2 p-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por número de orden, cliente, monto, fecha..."
                  aria-label="Buscar órdenes pendientes de cobro"
                  className="h-10 pl-10"
                />
              </div>
            </Card>

            <div className="mt-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {filters.map((filter) => {
                  const active = status === filter.value;
                  const Icon = filter.icon;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatus(filter.value)}
                      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                        active ? filter.activeBg : filter.bg
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {filter.label}
                      <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? "bg-white/25" : "bg-black/5"}`}>
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Mostrando <span className="text-slate-900 dark:text-white">{filtradas.length}</span> de {pendientes.length}
              </p>
            </div>

            <div className="custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              {pendientes.length === 0 ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/60">
                    <CircleCheck className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">Todo está cobrado</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No hay órdenes con saldo pendiente para cobrar.</p>
                </div>
              ) : filtradas.length === 0 ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 text-center dark:border-slate-700 dark:bg-slate-950/80">
                  <Search className="h-6 w-6 text-slate-400" />
                  <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">No encontramos coincidencias</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prueba con otro número de orden, cliente, monto o estado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {filtradas.map((orden) => (
                    <PendienteCard
                      key={orden.id}
                      o={orden}
                      clientes={clientes}
                      cajaAbierta={cajaAbierta}
                      onCobrarClick={setOrdenSeleccionada}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {ordenSeleccionada && user?.tenant && (
        <CobrarOrdenDialog
          orden={ordenSeleccionada}
          onClose={() => setOrdenSeleccionada(null)}
          tenant={user.tenant}
          cajaAbierta={cajaAbierta}
          clientes={clientes}
          queryClient={queryClient}
        />
      )}
    </>
  );
}
