import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  const orderNumbers = [
    'KL-202609-0064',
    'KL-202609-0208',
    'KL-202609-0209',
    'KL-202609-0100',
    'KL-202609-0191',
    'KL-202609-0205'
  ];

  const { data: ords } = await supabase
    .from('ordenes')
    .select('id, numero, total, pagado, saldo, estado, metodo_pago, creado_en')
    .eq('tenant_id', tenantId)
    .in('numero', orderNumbers);

  console.log('Orders info:');
  console.log(JSON.stringify(ords, null, 2));

  // Also check if there are multiple orders with the same numero!
  const { data: allOrdsWithSameNum } = await supabase
    .from('ordenes')
    .select('id, numero, tenant_id, creado_en')
    .eq('tenant_id', tenantId);
  
  const counts = {};
  for (const o of allOrdsWithSameNum || []) {
    counts[o.numero] = (counts[o.numero] || 0) + 1;
  }
  const duplicates = Object.entries(counts).filter(([num, count]) => count > 1);
  console.log('Duplicate order numbers in MR tenant:', duplicates);
}

run().catch(console.error);
