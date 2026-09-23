import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  const { count, error } = await supabase
    .from('ordenes')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  console.log(`Total orders for MR: ${count}`);

  const { data: first10 } = await supabase
    .from('ordenes')
    .select('numero, creado_en')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: true })
    .limit(10);
  console.log('Oldest 10 orders:', first10);

  const { data: last10 } = await supabase
    .from('ordenes')
    .select('numero, creado_en')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: false })
    .limit(10);
  console.log('Newest 10 orders:', last10);

  // Group by month of creado_en and month in numero
  const { data: allOrds } = await supabase
    .from('ordenes')
    .select('numero, creado_en')
    .eq('tenant_id', tenantId);

  const monthCount = {};
  for (const o of allOrds || []) {
    const ym = o.creado_en?.substring(0, 7) || 'unknown';
    monthCount[ym] = (monthCount[ym] || 0) + 1;
  }
  console.log('Orders count by creado_en month:', monthCount);

  const numPrefixCount = {};
  for (const o of allOrds || []) {
    const m = o.numero?.match(/^KL-(\d{6})/);
    const pref = m ? m[1] : 'other';
    numPrefixCount[pref] = (numPrefixCount[pref] || 0) + 1;
  }
  console.log('Orders count by numero prefix:', numPrefixCount);
}

run().catch(console.error);
