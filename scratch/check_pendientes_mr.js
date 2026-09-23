import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const realId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  const { data: pends } = await supabase
    .from('ordenes')
    .select('id, numero, creado_en, total, pagado, saldo, estado, metodo_pago')
    .eq('tenant_id', realId)
    .gt('saldo', 0)
    .eq('metodo_pago', 'PAGO_AL_RETIRAR')
    .neq('estado', 'ENTREGADA')
    .neq('estado', 'ANULADA');

  console.log(`Total pendientes de cobro: ${pends?.length}`);
  const byMonth = {};
  for (const o of pends || []) {
    const ym = o.creado_en.slice(0, 7);
    byMonth[ym] = (byMonth[ym] || 0) + 1;
  }
  console.log('Pendientes por mes de creado_en:', byMonth);

  console.log('\nAll pendientes list (first 30):');
  for (const o of (pends || []).slice(0, 30)) {
    console.log(`[${o.creado_en}] ${o.numero} | total:${o.total} | pagado:${o.pagado} | saldo:${o.saldo} | ${o.estado}`);
  }
}

run().catch(console.error);
