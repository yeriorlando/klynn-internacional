import test from "node:test";
import assert from "node:assert/strict";
import { ordenToEF2Payload } from "./orden-to-ef2.ts";

const tenant = {
  id: "11111111-1111-1111-1111-111111111111",
  nombre: "Lavandería Prueba",
  slug: "prueba",
  rnc: "132596161",
  direccion: "Santo Domingo",
  email: "fiscal@example.com",
};
const config = { itbis_incluido: false, ncf_secuencia: "E32" };
const baseOrder = {
  id: "orden-1",
  tenant_id: tenant.id,
  numero: "ORD-1",
  items: [{ descripcion: "Lavado", cantidad: 1, precio_unitario: 1000 }],
  servicios: ["Lavado"],
  subtotal: 1000,
  itbis: 180,
  descuento: 0,
  total: 1180,
  pagado: 1180,
  saldo: 0,
  metodo_pago: "EFECTIVO",
  creado_en: "2026-08-28T12:00:00.000Z",
};
const buyer = { nombre: "Empresa", apellido: "Prueba", cedula: "101234567" };

test("E32 menor de RD$250,000 omite comprador y deja la secuencia a EF2", () => {
  const payload: any = ordenToEF2Payload(baseOrder as any, null, config as any, tenant as any, "E32");
  assert.equal(payload.ECF.Encabezado.IdDoc.TipoeCF, "32");
  assert.ok(payload.ECF.Encabezado.IdDoc.FechaLimitePago);
  assert.equal(payload.ECF.Encabezado.IdDoc.FechaVencimientoSecuencia, undefined);
  assert.equal(payload.ECF.Encabezado.Comprador, undefined);
  assert.equal(payload.ECF.Encabezado.IdDoc.eNCF, undefined);
});

test("E31 incluye comprador y totales gravados", () => {
  const payload: any = ordenToEF2Payload(baseOrder as any, buyer as any, config as any, tenant as any, "E31");
  assert.equal(payload.ECF.Encabezado.Comprador.RNCComprador, "101234567");
  assert.equal(payload.ECF.Encabezado.Totales.MontoGravadoTotal, "1000.00");
  assert.equal(payload.ECF.Encabezado.Totales.TotalITBIS, "180.00");
});

test("E34 coloca la referencia dentro del encabezado", () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 30);
  const note = { ...baseOrder, id: "orden-1:nc", itbis: 0, subtotal: 100, total: 100,
    items: [{ descripcion: "Anulación", cantidad: 1, precio_unitario: 100, is_exento: true }] };
  const payload: any = ordenToEF2Payload(
    note as any, buyer as any, config as any, tenant as any, "E34",
    { ncf: "E310000000001", date: recentDate.toISOString(), code: "03", reason: "Corrección de montos" },
  );
  assert.deepEqual(payload.ECF.Encabezado.InformacionReferencia, {
    NCFModificado: "E310000000001",
    FechaNCFModificado: `${String(recentDate.getDate()).padStart(2, "0")}-${String(recentDate.getMonth() + 1).padStart(2, "0")}-${recentDate.getFullYear()}`,
    CodigoModificacion: "3",
    RazonModificacion: "Corrección de montos",
  });
  assert.equal(payload.ECF.Encabezado.IdDoc.IndicadorNotaCredito, "0");
});

test("E34 de una E32 menor de RD$250,000 no inventa comprador", () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 31);
  const note = { ...baseOrder, id: "orden-1:nc-e32", itbis: 0, subtotal: 100, total: 100,
    items: [{ descripcion: "Devolución", cantidad: 1, precio_unitario: 100, is_exento: true }] };
  const payload: any = ordenToEF2Payload(
    note as any, null, config as any, tenant as any, "E34",
    { ncf: "E320000000001", date: oldDate.toISOString(), code: "03", reason: "Devolución" },
  );
  assert.equal(payload.ECF.Encabezado.Comprador, undefined);
  assert.equal(payload.ECF.Encabezado.IdDoc.IndicadorNotaCredito, "1");
});

test("E33 exige una referencia original", () => {
  assert.throws(
    () => ordenToEF2Payload(baseOrder as any, buyer as any, config as any, tenant as any, "E33"),
    /requiere el e-NCF original/,
  );
});

test("E33 usa los totales simplificados exigidos por EF2", () => {
  const payload: any = ordenToEF2Payload(
    baseOrder as any, buyer as any, config as any, tenant as any, "E33",
    { ncf: "E310000000001", date: baseOrder.creado_en, code: "03", reason: "Ajuste" },
  );
  assert.deepEqual(payload.ECF.Encabezado.Totales, {
    MontoExento: "1180.00",
    MontoTotal: "1180.00",
  });
  assert.equal(payload.ECF.Encabezado.IdDoc.IndicadorMontoGravado, undefined);
  assert.equal(payload.ECF.DetallesItems.Item[0].IndicadorFacturacion, "4");
});
