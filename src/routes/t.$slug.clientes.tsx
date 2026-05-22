import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, UserPlus, Phone, Mail, MapPin, Trash2, Users } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getClientes, saveCliente, deleteCliente, getOrdenes, formatRD, formatPhoneRD, uid,
  type Cliente,
} from "@/lib/storage";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

import { ClienteDialog } from "@/components/klynn/ClienteDialog";
import { useClientes, useOrdenes } from "@/hooks/use-queries";

export const Route = createFileRoute("/t/$slug/clientes")({ component: ClientesPage });

function ClientesPage() {
  const user = useRequireAuth();
  const tenantId = user?.tenant?.id || '';

  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Cliente | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: clientes = [], isLoading: loadingClientes } = useClientes(tenantId);
  const { data: ordenes = [], isLoading: loadingOrdenes } = useOrdenes(tenantId);

  const tenant = user?.tenant;

  const loading = loadingClientes || loadingOrdenes;

  const filt = clientes.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.telefono.includes(q));

  if (!user || user.tenant.id === '__loading__') return null;

  function deudaCliente(id: string) {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.saldo, 0);
  }
  function totalGastado(id: string) {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.total, 0);
  }

  return (
    <div>
      <PageHeader title="Clientes" description={`${clientes.length} clientes registrados`}>
        <ExportAndPrintButtons 
          filename="Clientes" 
          tenant={tenant}
          columns={["Nombre", "Teléfono", "Email", "Dirección", "Tipo", "Total Gastado", "Deuda Actual"]}
          data={filt.map(c => [
            `${c.nombre} ${c.apellido || ""}`,
            c.telefono,
            c.email || "—",
            c.direccion || "—",
            c.tipo,
            formatRD(totalGastado(c.id)),
            formatRD(deudaCliente(c.id))
          ])}
        />
        <Button onClick={() => setShowNew(true)} className="bg-gradient-primary text-white transition-all duration-200 active:scale-95"><UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente</Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="pl-10" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filt.map((c) => {
          const deuda = deudaCliente(c.id);
          const total = totalGastado(c.id);
          return (
            <Card key={c.id} className="cursor-pointer p-5 transition hover:shadow-elegant" onClick={() => setEdit(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{c.nombre} {c.apellido || ""}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {c.telefono}</div>
                  {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {c.email}</div>}
                  {c.direccion && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {c.direccion}</div>}
                </div>
                {c.tipo === "Empresa" ? (
                  <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">Empresa</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Consumidor Final</Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="text-muted-foreground">Total gastado</div><div className="font-display text-base">{formatRD(total)}</div></div>
                <div><div className="text-muted-foreground">Deuda</div><div className={`font-display text-base ${deuda > 0 ? "text-destructive" : ""}`}>{formatRD(deuda)}</div></div>
              </div>
            </Card>
          );
        })}
        {filt.length === 0 && (
          <Card className="col-span-full p-12 text-center border border-dashed border-border/60 bg-surface/30 backdrop-blur-md rounded-2xl py-16 flex flex-col items-center justify-center">
            <div className="rounded-2xl bg-blue-50 p-4 mb-4 text-blue-600 shadow-sm">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">¡Aún no hay clientes!</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              Registra a tus clientes recurrentes para llevar el control de sus pedidos, saldos y recordatorios de pago de forma organizada.
            </p>
            <Button onClick={() => setShowNew(true)} className="mt-6 bg-gradient-primary text-white font-bold transition-all duration-200 active:scale-95 shadow-md">
              <UserPlus className="mr-1.5 h-4 w-4" /> Registrar primer cliente
            </Button>
          </Card>
        )}
      </div>
 
      <ClienteDialog 
        open={showNew || !!edit} 
        onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} 
        cliente={edit} 
        tenant={tenant} 
        onDone={() => { setEdit(null); setShowNew(false); }} 
      />
    </div>
  );
}
