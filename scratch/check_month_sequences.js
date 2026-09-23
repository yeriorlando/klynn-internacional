import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const realId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function checkNumbers() {
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('ordenes')
      .select('numero, creado_en')
      .eq('tenant_id', realId)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const byMonth = {};
  for (const o of all) {
    const ym = o.creado_en.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(o.numero);
  }

  for (const ym of Object.keys(byMonth).sort()) {
    const nums = byMonth[ym].sort();
    console.log(`Month ${ym}: count=${nums.length}, first=${nums[0]}, last=${nums[nums.length - 1]}`);
  }
}

checkNumbers().catch(console.error);
