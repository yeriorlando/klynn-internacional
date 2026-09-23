import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  const caja22Id = 'ff09dd33-c02d-4a1b-9801-b52ec27b397d';
  const caja21Id = '9d2b2562-3e77-4a8b-864e-a894c06fe6a9';

  console.log('=== MOVIMIENTOS CAJA 22 SEPT (ff09dd33) ===');
  const { data: movs22, error: err22 } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('caja_id', caja22Id)
    .order('creado_en', { ascending: true });
  
  if (err22) console.error('Error 22:', err22);
  else {
    console.log(`Total movs in caja 22: ${movs22.length}`);
    for (const m of movs22) {
      console.log(`[${m.creado_en}] ${m.tipo} | ${m.concepto} | $${m.monto} | ${m.metodo} | orden_id: ${m.orden_id}`);
    }
  }

  console.log('\n=== MOVIMIENTOS CAJA 21 SEPT (9d2b2562) ===');
  const { data: movs21, error: err21 } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('caja_id', caja21Id)
    .order('creado_en', { ascending: true });
  
  if (err21) console.error('Error 21:', err21);
  else {
    console.log(`Total movs in caja 21: ${movs21.length}`);
    for (const m of movs21) {
      console.log(`[${m.creado_en}] ${m.tipo} | ${m.concepto} | $${m.monto} | ${m.metodo} | orden_id: ${m.orden_id}`);
    }
  }
}

run().catch(console.error);
