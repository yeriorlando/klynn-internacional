import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  console.log('=== CAJAS (Last 5) ===');
  const { data: cajas } = await supabase
    .from('cajas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('abierta_en', { ascending: false })
    .limit(5);
  console.log(JSON.stringify(cajas, null, 2));

  console.log('\n=== MOVIMIENTOS FOR 0191 ===');
  const { data: movs191 } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('concepto', '%0191%');
  console.log(JSON.stringify(movs191, null, 2));

  console.log('\n=== ALL MOVIMIENTOS ON 2026-09-21 and 2026-09-22 ===');
  const { data: movs } = await supabase
    .from('movimientos_caja')
    .select('id, caja_id, tipo, concepto, monto, metodo_pago, creado_en')
    .eq('tenant_id', tenantId)
    .gte('creado_en', '2026-09-21T00:00:00')
    .order('creado_en', { ascending: true });
  console.log(JSON.stringify(movs, null, 2));
}

run().catch(console.error);
