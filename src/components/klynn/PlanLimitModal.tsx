import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldAlert, Users, Package } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Tenant } from "@/lib/storage";

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "orders" | "employees";
  limit: number | null;
  tenant: Tenant;
}

export function PlanLimitModal({ open, onOpenChange, type, limit, tenant }: PlanLimitModalProps) {
  const navigate = useNavigate();

  const isOrders = type === "orders";
  const Icon = isOrders ? Package : Users;
  const title = isOrders ? "Capacidad mensual alcanzada" : "Límite de personal alcanzado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[390px] rounded-2xl p-5 sm:p-6 gap-0 overflow-hidden border border-border shadow-2xl bg-card text-card-foreground">
        {/* Header Icon + Title */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 ring-4 ring-rose-500/5 shadow-2xs">
            <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-base sm:text-lg font-display font-extrabold text-foreground">
            {title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed text-justify px-1">
            {isOrders ? (
              <>
                Has completado el límite de <strong className="text-foreground font-bold">{limit} órdenes</strong> de tu plan y consumido las <strong className="text-foreground font-bold">15 órdenes de cortesía</strong>. Para seguir registrando nuevos pedidos, <strong className="text-foreground font-bold">actualiza a un plan superior</strong>.
              </>
            ) : (
              <>
                Tu plan actual permite un máximo de <strong className="text-foreground font-bold">{limit} empleados</strong>. Para añadir más colaboradores, <strong className="text-foreground font-bold">actualiza tu suscripción</strong>.
              </>
            )}
          </p>
        </div>

        {/* Compact Capacity Pill */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-2xs text-primary shrink-0 border border-slate-200/60 dark:border-slate-700">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tu plan actual</div>
              <div className="text-xs font-black text-foreground truncate">
                {limit} {isOrders ? "órdenes/mes" : "empleados"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            100% Lleno
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <Button 
            className="w-full h-10.5 rounded-xl font-bold text-xs sm:text-sm bg-primary hover:bg-primary/95 text-white shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug }, search: { tab: "plan" } as any });
            }}
          >
            <Rocket className="h-4 w-4" />
            <span>Ver Planes y Mejorar</span>
          </Button>

          <Button 
            variant="secondary"
            className="w-full h-10 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all active:scale-98 flex items-center justify-center cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cerrar por ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
