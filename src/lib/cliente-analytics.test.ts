import assert from "node:assert/strict";
import test from "node:test";

import { buildClienteAnalytics, getSectorOptions } from "./cliente-analytics.ts";
import type { Cliente, Orden } from "./storage.ts";

const baseOrder: Orden = {
  id: "ord-1",
  tenant_id: "tenant-1",
  numero: "0001",
  cliente_id: "cliente-1",
  empleado_id: "empleado-1",
  servicios: ["Lavado"],
  items: [],
  subtotal: 0,
  itbis: 0,
  descuento: 0,
  total: 0,
  pagado: 0,
  saldo: 0,
  metodo_pago: "EFECTIVO",
  estado: "RECIBIDA",
  fecha_entrega: "2026-09-23T12:00:00.000Z",
  es_urgente: false,
  creado_en: "2026-09-22T12:00:00.000Z",
};

test("separa prendas y libras y excluye anuladas de los acumulados", () => {
  const orders: Orden[] = [
    {
      ...baseOrder,
      total: 850,
      pagado: 500,
      saldo: 350,
      items: [
        { descripcion: "Camisa", cantidad: 3, precio_unitario: 100, servicio_origen: "Lavado" },
        {
          descripcion: "↳ Ropa por libra",
          cantidad: 10.5,
          precio_unitario: 50,
          es_libra: true,
          servicio_origen: "Lavado",
        },
      ],
    },
    {
      ...baseOrder,
      id: "ord-2",
      numero: "0002",
      estado: "ANULADA",
      total: 999,
      items: [{ descripcion: "Pantalón", cantidad: 9, precio_unitario: 111 }],
    },
  ];

  const result = buildClienteAnalytics(orders, "cliente-1");
  assert.equal(result.ordenes.length, 2);
  assert.equal(result.totalOrdenes, 1);
  assert.equal(result.totalFacturado, 850);
  assert.equal(result.totalPiezas, 3);
  assert.equal(result.totalLibras, 10.5);
  assert.equal(result.servicios[0]?.piezas, 3);
  assert.equal(result.servicios[0]?.libras, 10.5);
  assert.equal(result.pesajes.length, 1);
  assert.equal(result.pesajes[0]?.libras, 10.5);
  assert.equal(result.pesajes[0]?.precioUnitario, 50);
  assert.equal(result.promedioLibrasPorOrden, 10.5);
  assert.equal(result.tarifaPromedioLibra, 50);
});

test("agrupa sectores ignorando espacios, mayúsculas y acentos", () => {
  const cliente = (id: string, sector?: string): Cliente => ({
    id,
    tenant_id: "tenant-1",
    nombre: id,
    telefono: "8090000000",
    sector,
    tipo: "Consumidor Final",
    limite_credito: 0,
    creado_en: "2026-09-22T12:00:00.000Z",
  });

  const sectors = getSectorOptions([
    cliente("a", "Piantini"),
    cliente("b", " piantíni "),
    cliente("c"),
  ]);

  assert.deepEqual(sectors, [{ key: "piantini", label: "Piantini", count: 2 }]);
});
