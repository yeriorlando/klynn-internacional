import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function auditCuadre(cajaId, label) {
  const { data: c } = await supabase.from('cajas').select('*').eq('id', cajaId).single();
  const { data: movs } = await supabase.from('movimientos_caja').select('*').eq('caja_id', cajaId).order('creado_en', { ascending: true });
  
  // Orders within the range
  const { data: ords } = await supabase
    .from('ordenes')
    .select('id, numero, total, pagado, saldo, metodo_pago, creado_en')
    .eq('tenant_id', tenantId)
    .gte('creado_en', c.abierta_en)
    .lte('creado_en', c.cerrada_en || new Date().toISOString())
    .order('creado_en', { ascending: true });

  console.log(`\n======================================================`);
  console.log(`AUDITORIA DE CUADRE: ${label}`);
  console.log(`Caja ID: ${c.id}`);
  console.log(`Abierta: ${c.abierta_en} | Cerrada: ${c.cerrada_en}`);
  console.log(`Monto inicial: RD$ ${c.monto_inicial}`);
  console.log(`Monto esperado registrado: RD$ ${c.monto_esperado_efectivo}`);
  console.log(`Monto contado efectivo: RD$ ${c.monto_contado_efectivo}`);
  console.log(`Diferencia registrada: RD$ ${c.diferencia}`);
  console.log(`Notas cierre: ${c.notas_cierre}`);
  console.log(`\n--- ÓRDENES CREADAS EN EL PERIODO (${ords?.length}) ---`);
  for (const o of ords || []) {
    console.log(`  ${o.numero} | total: $${o.total} | pagado: $${o.pagado} | saldo: $${o.saldo} | metodo: ${o.metodo_pago}`);
  }
  console.log(`\n--- MOVIMIENTOS REGISTRADOS EN LA CAJA (${movs?.length}) ---`);
  for (const m of movs || []) {
    console.log(`  [${m.creado_en}] ${m.tipo} | $${m.monto} | ${m.metodo} | ${m.concepto}`);
  }
}

async function run() {
  await auditCuadre('9d2b2562-3e77-4a8b-864e-a894c06fe6a9', 'CUADRE DEL 21 DE SEPTIEMBRE');
  await auditCuadre('ff09dd33-c02d-4a1b-9801-b52ec27b397d', 'CUADRE DEL 22 DE SEPTIEMBRE');
}

run().catch(console.error);
