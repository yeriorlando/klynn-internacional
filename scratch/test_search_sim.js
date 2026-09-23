import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const realId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function simulateGetOrdenes() {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let result = await supabase
      .from("ordenes")
      .select("*")
      .eq("tenant_id", realId)
      .order("creado_en", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) {
      console.log('Error in fetch:', result.error);
      hasMore = false;
      break;
    }

    const { data } = result;
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...data);
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  console.log(`Total retrieved: ${allData.length}`);

  // Test search for "0191"
  const q = "0191";
  const searchLower = q.toLowerCase();
  const matched = allData.filter(o => o.numero.toLowerCase().includes(searchLower));
  console.log(`Searching for "${q}" matches:`, matched.map(m => ({ numero: m.numero, creado_en: m.creado_en })));

  // Test search for "191"
  const q2 = "191";
  const matched2 = allData.filter(o => o.numero.toLowerCase().includes(q2));
  console.log(`Searching for "${q2}" matches:`, matched2.map(m => ({ numero: m.numero, creado_en: m.creado_en })));

  // Test search for "0001"
  const q3 = "0001";
  const matched3 = allData.filter(o => o.numero.toLowerCase().includes(q3));
  console.log(`Searching for "${q3}" matches:`, matched3.map(m => ({ numero: m.numero, creado_en: m.creado_en })));
}

simulateGetOrdenes().catch(console.error);
