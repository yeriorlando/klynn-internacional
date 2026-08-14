import { createPortal } from "react-dom";
import { useEffect } from "react";
import { type Orden, type Cliente, type Tenant, type Empleado, formatRD } from "@/lib/storage";

interface DeliveryManifestPrintProps {
  tenant: Tenant;
  ordenes: Orden[];
  clientes: Cliente[];
  repartidor?: Empleado | null;
  onClose: () => void;
}

export function DeliveryManifestPrint({
  tenant,
  ordenes,
  clientes,
  repartidor,
  onClose,
}: DeliveryManifestPrintProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const totalPrendas = ordenes.reduce((acc, o) => acc + (o.items?.reduce((s, it) => s + it.cantidad, 0) || 0), 0);
  const totalPorCobrar = ordenes.reduce((acc, o) => acc + (o.saldo || 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-white p-8 text-black overflow-y-auto print:p-2 print:m-0">
      {/* Screen Control Bar (Hidden on Print) */}
      <div className="mb-6 flex items-center justify-between border-b pb-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold">Hoja de Ruta / Manifiesto de Despacho</h2>
          <p className="text-xs text-gray-500">Vista previa de impresión para el repartidor.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto border border-gray-200 p-6 rounded-xl print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{tenant.nombre}</h1>
            <p className="text-xs text-gray-600">{tenant.direccion} {tenant.telefono ? `· Tel: ${tenant.telefono}` : ""}</p>
            <p className="text-xs font-bold text-blue-800 mt-1 uppercase tracking-wider">MANIFIESTO DE DESPACHO Y CONTROL DE RUTA</p>
          </div>
          <div className="text-right text-xs">
            <p><span className="font-bold">Fecha:</span> {new Date().toLocaleDateString("es-DO", { dateStyle: "full" })}</p>
            <p><span className="font-bold">Hora:</span> {new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="mt-1">
              <span className="font-bold">Repartidor:</span> {repartidor ? `${repartidor.nombre} ${repartidor.apellido || ""}` : "General / Sin Asignar"}
            </p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200 text-center text-xs">
          <div>
            <span className="text-gray-500 font-medium">Total Paradas</span>
            <p className="text-base font-black text-gray-900">{ordenes.length}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Total Prendas</span>
            <p className="text-base font-black text-gray-900">{totalPrendas}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Total a Cobrar</span>
            <p className="text-base font-black text-emerald-700">{formatRD(totalPorCobrar)}</p>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Estado</span>
            <p className="text-base font-black text-blue-700">En Despacho</p>
          </div>
        </div>

        {/* Stops Table */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-gray-800 uppercase tracking-wider text-[10px]">
              <th className="py-2 px-1 w-8 text-center">#</th>
              <th className="py-2 px-2 w-20">Orden</th>
              <th className="py-2 px-2">Cliente y Teléfono</th>
              <th className="py-2 px-2">Dirección / Sector</th>
              <th className="py-2 px-2 text-center w-16">Prendas</th>
              <th className="py-2 px-2 text-right w-24">Cobro</th>
              <th className="py-2 px-3 text-center w-28">Firma / Receptor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ordenes.map((o, idx) => {
              const cli = clientes.find((c) => c.id === o.cliente_id);
              const totalItems = o.items?.reduce((s, it) => s + it.cantidad, 0) || 0;
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-1 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="py-2.5 px-2 font-mono font-bold text-gray-900">#{o.numero}</td>
                  <td className="py-2.5 px-2">
                    <p className="font-bold text-gray-900">{cli?.nombre || "Sin nombre"}</p>
                    <p className="text-[10px] text-gray-500">{cli?.telefono || "—"}</p>
                  </td>
                  <td className="py-2.5 px-2">
                    <p className="text-gray-900">{cli?.direccion || o.direccion_entrega || "—"}</p>
                    {(cli?.referencia || o.referencia_entrega) && (
                      <p className="text-[10px] text-gray-500 italic font-sans">Ref: {cli?.referencia || o.referencia_entrega}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-gray-700">{totalItems}</td>
                  <td className="py-2.5 px-2 text-right">
                    {o.saldo > 0 ? (
                      <span className="font-black text-rose-600">{formatRD(o.saldo)}</span>
                    ) : (
                      <span className="font-bold text-emerald-600">PAGADO</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-b border-gray-300">
                    <div className="h-7 border-b border-dashed border-gray-400 mt-1" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer Signature */}
        <div className="mt-12 grid grid-cols-2 gap-12 pt-6 border-t border-gray-300 text-xs">
          <div className="text-center">
            <div className="h-10 border-b border-gray-400 mx-12" />
            <p className="mt-2 font-bold text-gray-700">Firma del Despachador (Local)</p>
          </div>
          <div className="text-center">
            <div className="h-10 border-b border-gray-400 mx-12" />
            <p className="mt-2 font-bold text-gray-700">Firma del Repartidor (Recibido)</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
