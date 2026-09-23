import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

async function run() {
  console.log('--- Inspecting User & Tenant ---');
  const { data: users, error: uErr } = await supabase
    .from('tenants')
    .select('*')
    .or('email.ilike.%mrgroupsrl01%,email_contacto.ilike.%mrgroupsrl01%');
  
  console.log('Tenants match:', users, uErr);

  // Also search in all tenants if name matches MR Lavanderia Express
  const { data: allTenants } = await supabase
    .from('tenants')
    .select('id, nombre, slug, email, email_contacto, creado_en');
  
  const mrTenant = allTenants?.filter(t => 
    t.nombre?.toLowerCase().includes('mr') || 
    t.email?.toLowerCase().includes('mrgroupsrl01') ||
    t.email_contacto?.toLowerCase().includes('mrgroupsrl01')
  );
  console.log('MR Tenants found:', mrTenant);

  const tenantId = mrTenant?.[0]?.id || '776ef0f7-1e84-4e43-8d53-8e671e333005';
  console.log('Using tenantId:', tenantId);

  // Check Cajas
  const { data: cajas, error: cErr } = await supabase
    .from('cajas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('abierta_en', { ascending: false })
    .limit(10);
  console.log('Recent Cajas:', cajas?.map(c => ({
    id: c.id,
    abierta_en: c.abierta_en,
    cerrada_en: c.cerrada_en,
    estado: c.estado,
    monto_apertura: c.monto_apertura,
    monto_esperado: c.monto_esperado,
    monto_real: c.monto_real,
    diferencia: c.diferencia
  })));

  // Check Movimientos for Caja on 21 and 22 Sept
  const { data: movs, error: mErr } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('creado_en', '2026-09-20T00:00:00')
    .order('creado_en', { ascending: false })
    .limit(50);
  console.log(`Movimientos count (since Sep 20): ${movs?.length}`);
  
  // Look for 0191
  const movs191 = movs?.filter(m => JSON.stringify(m).includes('0191') || JSON.stringify(m).includes('191'));
  console.log('Movimientos mentioning 191:', movs191);

  // Check order 0191 in ordenes
  const { data: ords191 } = await supabase
    .from('ordenes')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('numero', '%0191%');
  console.log('Orders with 0191:', ords191);

  // Check recent orders (last 20)
  const { data: recentOrds } = await supabase
    .from('ordenes')
    .select('id, numero, estado, creado_en, total, saldo, metodo_pago')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: false })
    .limit(20);
  console.log('Recent 20 orders:', recentOrds);
}

run().catch(console.error);
