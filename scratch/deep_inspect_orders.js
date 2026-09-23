import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';

async function run() {
  const ids = [
    '118ec041-a7d5-4189-afe1-f96d9dd21c3b', // 0100
    '7a0074d4-9aeb-407d-b46e-6bcabbf73c5f', // 0191
    '8a5facab-331d-4948-bb7d-7e1494b189a4', // 0064
    '7ba3bee0-861d-4062-9536-95036d3884e8', // 0208
    'a7be942f-0c34-4f4e-b034-dbce9ea196fc', // 0209
    'b70212f8-a73d-43b6-9489-0ff2a6583dd9', // 0205
  ];

  for (const id of ids) {
    const { data: ord } = await supabase.from('ordenes').select('*').eq('id', id).single();
    const { data: movs } = await supabase.from('movimientos_caja').select('*').eq('orden_id', id).order('creado_en', { ascending: true });
    console.log(`\n========================================`);
    console.log(`ORDEN ${ord.numero} (${ord.id})`);
    console.log(`Creado en: ${ord.creado_en}`);
    console.log(`Total: ${ord.total}, Pagado: ${ord.pagado}, Saldo: ${ord.saldo}, Estado: ${ord.estado}, Metodo: ${ord.metodo_pago}`);
    console.log(`Pagos detalle:`, ord.pagos_detalle);
    console.log(`Movimientos vinculados (${movs?.length}):`);
    for (const m of movs || []) {
      console.log(`  [${m.creado_en}] Caja: ${m.caja_id} | ${m.tipo} | ${m.concepto} | $${m.monto} | ${m.metodo}`);
    }
  }
}

run().catch(console.error);
