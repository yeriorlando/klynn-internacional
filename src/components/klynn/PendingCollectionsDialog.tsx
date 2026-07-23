import { startTransition, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrdenesPage } from "@/components/klynn/OrdenesPage";
import type { Empleado, Tenant } from "@/lib/storage";

function OrdersModalSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-10 w-44 rounded-xl bg-slate-200/90 dark:bg-slate-800" />
          <div className="h-4 w-52 rounded-lg bg-slate-200/70 dark:bg-slate-800/80" />
        </div>
        <div className="flex gap-2 pr-10">
          <div className="h-10 w-36 rounded-xl bg-amber-100 dark:bg-amber-950/60" />
          <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-28 rounded-xl bg-emerald-100 dark:bg-emerald-950/60" />
        </div>
      </div>

      <div className="h-20 rounded-2xl bg-primary/[0.06] dark:bg-primary/10" />
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-11 min-w-0 flex-1 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-11 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-11 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="flex gap-2">
        {[128, 132, 124, 136, 112, 132].map((width, index) => (
          <div key={index} className="h-9 rounded-full bg-slate-200/80 dark:bg-slate-800" style={{ width }} />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-12 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex h-[76px] items-center gap-6 border-b border-slate-100 px-5 last:border-0 dark:border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="ml-auto h-7 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-7 w-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PendingCollectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: { empleado: Empleado; tenant: Tenant };
}

export function PendingCollectionsDialog({ open, onOpenChange, authUser }: PendingCollectionsDialogProps) {
  const [renderOrders, setRenderOrders] = useState(false);

  useEffect(() => {
    if (!open) {
      setRenderOrders(false);
      return;
    }

    let contentFrame = 0;
    const shellFrame = window.requestAnimationFrame(() => {
      contentFrame = window.requestAnimationFrame(() => {
        startTransition(() => setRenderOrders(true));
      });
    });

    return () => {
      window.cancelAnimationFrame(shellFrame);
      if (contentFrame) window.cancelAnimationFrame(contentFrame);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(84vh,820px)] w-[min(94vw,1500px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-slate-200 bg-slate-50 p-0 shadow-2xl duration-200 will-change-transform sm:max-w-[1500px] dark:border-slate-800 dark:bg-slate-950 [&>button]:right-3 [&>button]:top-3 [&>button]:z-50">
        <DialogHeader className="sr-only">
          <DialogTitle>Ver órdenes</DialogTitle>
          <DialogDescription>
            Consulta, filtra y cobra órdenes sin salir de Nueva orden.
          </DialogDescription>
        </DialogHeader>

        <div
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pt-11 sm:p-5 sm:pt-11"
          aria-busy={!renderOrders}
        >
          {renderOrders ? <OrdenesPage authUser={authUser} embedded /> : <OrdersModalSkeleton />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
