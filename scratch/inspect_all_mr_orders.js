import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ordenes')
      .select('id, numero, creado_en, total, estado')
      .eq('tenant_id', tenantId)
      .order('creado_en', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Fetched total ${all.length} orders.`);
  const monthCount = {};
  for (const o of all) {
    const ym = o.creado_en?.substring(0, 7) || 'unknown';
    monthCount[ym] = (monthCount[ym] || 0) + 1;
  }
  console.log('Real orders count by month of creado_en:', monthCount);

  const numPrefixCount = {};
  for (const o of all) {
    const m = o.numero?.match(/^KL-(\d{6})/);
    const pref = m ? m[1] : (o.numero ? o.numero.substring(0, 10) : 'none');
    numPrefixCount[pref] = (numPrefixCount[pref] || 0) + 1;
  }
  console.log('Real orders count by numero prefix:', numPrefixCount);

  // Check September orders specifically
  const sepOrders = all.filter(o => o.numero?.includes('202609') || o.creado_en?.startsWith('2026-09'));
  console.log(`September orders count: ${sepOrders.length}`);
  console.log('September order numbers:', sepOrders.map(o => o.numero).sort());
}

run().catch(console.error);
