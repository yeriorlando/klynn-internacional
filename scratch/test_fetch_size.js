import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function testFetch() {
  const t0 = Date.now();
  console.log('Testing select * with range 0..999...');
  const res1 = await supabase
    .from('ordenes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: false })
    .range(0, 999);
  console.log(`Page 1: ${res1.data?.length} rows, error: ${res1.error?.message}, time: ${Date.now() - t0}ms`);

  const t1 = Date.now();
  console.log('Testing select * with range 1000..1999...');
  const res2 = await supabase
    .from('ordenes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: false })
    .range(1000, 1999);
  console.log(`Page 2: ${res2.data?.length} rows, error: ${res2.error?.message}, time: ${Date.now() - t1}ms`);

  const str = JSON.stringify(res1.data) + JSON.stringify(res2.data);
  console.log(`Total payload size in JSON: ${(str.length / (1024 * 1024)).toFixed(2)} MB`);
}

testFetch().catch(console.error);
