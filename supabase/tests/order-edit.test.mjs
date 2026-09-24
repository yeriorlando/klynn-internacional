// Run: npm install --prefix scratch/order-edit-test-runtime --no-save --package-lock=false @electric-sql/pglite
//      node --test supabase/tests/order-edit.test.mjs
// Isolated PostgreSQL engine: never connects to a Klynn database.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
const require = createRequire(
  new URL("../../scratch/order-edit-test-runtime/package.json", import.meta.url),
);
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const actor = "00000000-0000-0000-0000-000000000001";
const items = [{ descripcion: "Camisa", cantidad: 2, precio_unitario: 500 }];
before(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.tenants(id text,config jsonb);
    CREATE TABLE public.empleados(id uuid,tenant_id text,activo boolean,rol text,permisos jsonb,nombre text,email text);
    CREATE TABLE public.clientes(id text,tenant_id text);
    CREATE TABLE public.ecf_documents(order_id text,tenant_id text);
    CREATE TABLE public.ordenes(id text PRIMARY KEY,tenant_id text,numero text,cliente_id text,empleado_id text,
      estado text,items jsonb,servicios jsonb,servicios_precios jsonb,subtotal numeric,itbis numeric,descuento numeric,total numeric,
      pagado numeric,saldo numeric,metodo_pago text,fecha_entrega timestamptz,creado_en timestamptz,notas text,ncf text,ecf_id text,ecf_status text,
      nota_credito_ncf text,nota_debito_ncf text,nota_credito_monto numeric,nota_debito_monto numeric,promocion_id text,
      marbetes jsonb,marbete_piezas numeric,costo_envio numeric,es_urgente boolean,entrega_domicilio boolean,
      direccion_entrega text,referencia_entrega text,lat_entrega numeric,lng_entrega numeric,repartidor_id uuid,ubicacion_ropa text);
  `);
  await db.exec(
    await readFile(
      new URL("../migrations/20260924120000_order_editing.sql", import.meta.url),
      "utf8",
    ),
  );
});
after(() => db.close());
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE ordenes,orden_ediciones,empleados,clientes,tenants,auth.users,ecf_documents;
    INSERT INTO auth.users VALUES ('${actor}','admin@example.test');
    INSERT INTO empleados VALUES ('${actor}','tenant-a',true,'ADMIN',null,'Ana','admin@example.test');
    INSERT INTO tenants VALUES ('tenant-a','{"itbis_porcentaje":0,"recargo_urgencia":20}');
    INSERT INTO clientes VALUES ('client-a','tenant-a'),('client-b','tenant-a'),('client-other','tenant-b');
    INSERT INTO ordenes(id,tenant_id,numero,cliente_id,empleado_id,estado,items,servicios,servicios_precios,
      subtotal,itbis,descuento,total,pagado,saldo,metodo_pago,fecha_entrega,creado_en,costo_envio,es_urgente,entrega_domicilio)
    VALUES ('order-a','tenant-a','ORD-1','client-a','${actor}','RECIBIDA','${JSON.stringify(items)}','[]','{}',
      1000,0,0,1000,400,600,'EFECTIVO','2026-09-26','2026-09-24',0,false,false);
    SELECT set_config('request.jwt.claim.sub','${actor}',false); SET ROLE authenticated;
  `);
});
async function rpc(patch = null, token = null, preview = true, reason = "Corrección solicitada") {
  const { rows } = await db.query("SELECT public.editar_orden($1,$2,$3::jsonb,$4,$5) AS result", [
    "order-a",
    token,
    patch && JSON.stringify(patch),
    reason,
    preview,
  ]);
  return rows[0].result;
}
async function admin(sql) {
  await db.exec(`RESET ROLE; ${sql}; SET ROLE authenticated;`);
}
async function edit(patch, preview = true) {
  const ctx = await rpc();
  return rpc(patch, ctx.token, preview);
}

test("preview is read-only; save preserves identity and payments and writes audit", async () => {
  const ctx = await rpc();
  const patch = { items: [{ ...items[0], precio_unitario: 600 }] };
  const preview = await rpc(patch, ctx.token);
  assert.equal(preview.orden.total, 1200);
  assert.equal(preview.orden.saldo, 800);
  assert.equal((await rpc()).orden.total, 1000);
  assert.equal((await rpc()).historial.length, 0);
  const saved = await rpc(patch, ctx.token, false);
  assert.equal(saved.orden.pagado, 400);
  assert.equal(saved.orden.id, "order-a");
  assert.equal(saved.orden.numero, "ORD-1");
  const final = await rpc();
  assert.equal(final.historial.length, 1);
  assert.deepEqual(final.historial[0].cambios.total, { antes: 1000, despues: 1200 });
  assert.equal(final.historial[0].empleado_nombre, "Ana");
  await assert.rejects(rpc(patch, ctx.token, false), /cambió/);
  assert.equal((await rpc()).historial.length, 1);
});
test("concurrent payment invalidates the edit token", async () => {
  const ctx = await rpc();
  await admin("UPDATE ordenes SET pagado=800,saldo=200");
  await assert.rejects(rpc({ notas: "Cliente llamó" }, ctx.token, false), /cambió/);
  assert.equal((await rpc()).orden.pagado, 800);
});
test("pricing config change invalidates preview confirmation", async () => {
  const ctx = await rpc();
  await admin(`UPDATE tenants SET config='{"recargo_urgencia":30}'`);
  await assert.rejects(rpc({ es_urgente: true }, ctx.token, false), /cambió/);
});
test("overpayment is rejected without writes", async () => {
  await assert.rejects(
    edit({ items: [{ ...items[0], precio_unitario: 100 }] }, false),
    /menor que lo pagado/,
  );
  assert.equal((await rpc()).historial.length, 0);
});
test("protected field injection is rejected", async () => {
  for (const field of ["pagado", "saldo", "ncf", "tenant_id", "estado", "numero", "total"])
    await assert.rejects(edit({ [field]: "forged" }, false), /Campo no editable/);
});
test("fiscal documents block ALL edits, including delivery notes and dates", async () => {
  await admin(`UPDATE ordenes SET ncf='E310000000001'`);
  await assert.rejects(edit({ descuento: 50 }, false), /comprobante/);
  assert.equal((await rpc()).editable, false);
  await assert.rejects(edit({ notas: "No usar suavizante" }, false), /comprobante/);
  await assert.rejects(edit({ fecha_entrega: "2026-09-27" }, false), /comprobante/);
  await admin("UPDATE ordenes SET ncf='B0200000001'");
  await assert.rejects(edit({ notas: "Cambio de notas" }, false), /comprobante/);
});
test("document created before order fiscal metadata also locks financial edits", async () => {
  await admin(`INSERT INTO ecf_documents VALUES ('order-a','tenant-a')`);
  await assert.rejects(edit({ descuento: 50 }), /comprobante/);
});
test("closed and advanced orders enforce state restrictions", async () => {
  for (const estado of ["ENTREGADA", "ANULADA", "PAGADA", "INCIDENCIA", "EN_CAMINO"]) {
    await admin(`UPDATE ordenes SET estado='${estado}'`);
    await assert.rejects(edit({ notas: "Cambio de prueba" }), /Solo se editan/);
  }
  await admin(`UPDATE ordenes SET estado='EN_PROCESO'`);
  await assert.rejects(edit({ descuento: 50 }), /solo se permiten cambios de entrega/);
  await edit({ notas: "Cambio de prueba" }, false);
});
test("permissions are checked at save and respect explicit overrides", async () => {
  const ctx = await rpc();
  await admin(`UPDATE empleados SET rol='SUPERVISOR',permisos='[]'`);
  await assert.rejects(rpc({ notas: "No autorizado" }, ctx.token, false), /permiso/);
  await admin(`UPDATE empleados SET permisos=null`);
  await edit({ notas: "Supervisor autorizado" }, false);
  await admin(`UPDATE empleados SET rol='RECEPCIONISTA',permisos='["editar-orden"]'`);
  await edit({ notas: "Recepción autorizada" }, false);
  await admin(`UPDATE empleados SET activo=false`);
  await assert.rejects(rpc(), /acceso/);
});
test("tenant isolation and anonymous access", async () => {
  await admin(`UPDATE empleados SET tenant_id='tenant-b'`);
  await assert.rejects(rpc(), /acceso/);
  await db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE authenticated;`,
  );
  await assert.rejects(rpc(), /sesión/);
  await db.exec("RESET ROLE; SET ROLE anon");
  await assert.rejects(rpc(), /permission denied/);
});
test("audit cannot be changed by authenticated users", async () => {
  await edit({ notas: "Cambio auditado" }, false);
  await assert.rejects(db.exec("DELETE FROM orden_ediciones"), /permission denied/);
  await assert.rejects(
    db.exec(`INSERT INTO orden_ediciones(tenant_id) VALUES ('tenant-a')`),
    /permission denied/,
  );
});
test("failed audit insert rolls back the order write", async () => {
  await admin(
    `ALTER TABLE orden_ediciones ADD CONSTRAINT test_reject CHECK (motivo <> 'Rechazar auditoría')`,
  );
  const ctx = await rpc();
  await assert.rejects(
    rpc({ notas: "No debe guardarse" }, ctx.token, false, "Rechazar auditoría"),
    /test_reject/,
  );
  assert.equal((await rpc()).orden.notas, null);
  assert.equal((await rpc()).historial.length, 0);
  await admin("ALTER TABLE orden_ediciones DROP CONSTRAINT test_reject");
});
test("customer changes require same tenant and no existing payment", async () => {
  await assert.rejects(edit({ cliente_id: "client-b" }), /pagos registrados/);
  await admin("UPDATE ordenes SET pagado=0,saldo=1000");
  await assert.rejects(edit({ cliente_id: "client-other" }), /lavandería/);
  assert.equal((await edit({ cliente_id: "client-b" }, false)).orden.cliente_id, "client-b");
});
test("invalid quantities, prices, discount, reason and empty orders are rejected", async () => {
  for (const quantity of [0, -1, 1.5])
    await assert.rejects(edit({ items: [{ ...items[0], cantidad: quantity }] }), /cantidades/);
  await assert.rejects(edit({ items: [{ ...items[0], precio_unitario: -5 }] }), /cantidades/);
  await assert.rejects(edit({ descuento: 1500 }), /descuento supera/);
  await assert.rejects(edit({ items: [] }), /al menos/);
  const ctx = await rpc();
  await assert.rejects(rpc({ notas: "Una nota" }, ctx.token, false, ""), /motivo/);
});
test("shipping address clears old coordinates and in-transit address is locked", async () => {
  await admin(`UPDATE ordenes SET entrega_domicilio=true,lat_entrega=18,lng_entrega=-69`);
  const result = await edit({ direccion_entrega: "Nueva dirección" }, false);
  assert.equal(result.orden.lat_entrega, null);
  assert.equal(result.orden.lng_entrega, null);
  await admin(`UPDATE ordenes SET estado='EN_CAMINO'`);
  await assert.rejects(edit({ direccion_entrega: "Otra dirección" }), /Solo se editan/);
});
test("promotions, marbetes, credit and adjusted balances preserve financial data", async () => {
  await admin(`UPDATE ordenes SET promocion_id='promo'`);
  await assert.rejects(edit({ descuento: 50 }), /promoción/);
  await admin(`UPDATE ordenes SET promocion_id=null,marbetes='[{"piezas":2}]'`);
  await assert.rejects(edit({ descuento: 50 }), /marbetes/);
  await admin(`UPDATE ordenes SET marbetes=null,metodo_pago='CREDITO'`);
  await assert.rejects(edit({ descuento: 50 }), /crédito/);
  await admin(`UPDATE ordenes SET metodo_pago='EFECTIVO',saldo=0`);
  await assert.rejects(edit({ descuento: 50 }), /ajustes/);
});
test("historical pricing mismatch permits notes but not recalculation", async () => {
  await admin("UPDATE ordenes SET subtotal=900,total=900,saldo=500");
  await assert.rejects(edit({ descuento: 50 }), /tarifa histórica/);
  await edit({ notas: "Observación permitida" }, false);
});
test("tax-exclusive, tax-inclusive, exempt, urgency and service calculations", async () => {
  await admin(
    `UPDATE tenants SET config='{"itbis_porcentaje":18,"recargo_urgencia":20}'; UPDATE ordenes SET subtotal=1000,itbis=180,total=1180,saldo=780`,
  );
  const exclusive = await edit({ es_urgente: true });
  assert.equal(exclusive.orden.subtotal, 1200);
  assert.equal(exclusive.orden.itbis, 216);
  assert.equal(exclusive.orden.total, 1416);
  const exempt = await edit({ items: [{ ...items[0], is_exento: true }] });
  assert.equal(exempt.orden.itbis, 0);
  assert.equal(exempt.orden.total, 1000);
  await admin(
    `UPDATE tenants SET config='{"itbis_porcentaje":18,"itbis_incluido":true}'; UPDATE ordenes SET subtotal=847.46,itbis=152.54,total=1000,saldo=600`,
  );
  const inclusive = await edit({ items: [{ ...items[0], precio_unitario: 590 }] });
  assert.equal(inclusive.orden.subtotal, 1000);
  assert.equal(inclusive.orden.itbis, 180);
  assert.equal(inclusive.orden.total, 1180);
  const service = await edit({ servicios: ["Lavado"], servicios_precios: { Lavado: 180 } });
  assert.equal(service.orden.total, 1180);
});

test("the complete migration can be rerun without losing audit history", async () => {
  await edit({ notas: "Edición conservada" }, false);
  await db.exec("RESET ROLE");
  await db.exec(
    await readFile(
      new URL("../migrations/20260924120000_order_editing.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec("SET ROLE authenticated");
  assert.equal((await rpc()).historial.length, 1);
  await edit({ notas: "Segunda edición" }, false);
  assert.equal((await rpc()).historial.length, 2);
});

test("delivery-only changes support a tenant driver and a free storage location", async () => {
  const driver = "00000000-0000-0000-0000-000000000002";
  await admin(`UPDATE ordenes SET estado='LISTA',entrega_domicilio=true;
    INSERT INTO empleados VALUES ('${driver}','tenant-a',true,'REPARTIDOR',null,'José','driver@example.test')`);
  const result = await edit(
    {
      repartidor_id: driver,
      ubicacion_ropa: "A-12",
      fecha_entrega: "2026-09-27",
      notas: "Entregar por la tarde",
    },
    false,
  );
  assert.equal(result.orden.repartidor_id, driver);
  assert.equal(result.orden.total, 1000);
  assert.equal(result.orden.ubicacion_ropa, "A-12");
  const cleared = await edit({ repartidor_id: "" }, false);
  assert.equal(cleared.orden.repartidor_id, null);
  await admin(`UPDATE empleados SET tenant_id='tenant-b' WHERE id='${driver}'`);
  await assert.rejects(edit({ repartidor_id: driver }), /repartidor activo/);
  await admin(
    `INSERT INTO ordenes(id,tenant_id,estado,ubicacion_ropa) VALUES ('occupied','tenant-a','RECIBIDA','A-13')`,
  );
  await assert.rejects(edit({ ubicacion_ropa: " a-13 " }), /ocupada/);
});

test("a fiscal order in any editable production state remains completely locked", async () => {
  for (const state of ["RECIBIDA", "EN_PROCESO", "LISTA"]) {
    await admin(`UPDATE ordenes SET estado='${state}',ncf='B0200000001'`);
    for (const patch of [
      { notas: "No permitido" },
      { ubicacion_ropa: "A-1" },
      { fecha_entrega: "2026-09-27" },
    ])
      await assert.rejects(edit(patch, false), /comprobante fiscal/);
  }
});

test("existing schemas using text arrays for services are supported", async () => {
  await admin(`ALTER TABLE ordenes ALTER COLUMN servicios TYPE text[] USING ARRAY[]::text[]`);
  try {
    assert.equal(
      (await edit({ servicios: ["Lavado"], servicios_precios: { Lavado: 200 } }, false)).orden
        .total,
      1200,
    );
  } finally {
    await admin("ALTER TABLE ordenes ALTER COLUMN servicios TYPE jsonb USING to_jsonb(servicios)");
  }
});
