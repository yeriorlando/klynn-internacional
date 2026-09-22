import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';
const VITE_SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoiYW5vbiJ9.TsHqtNcA63ts-rjsS0VijOHICQ-06AXymSoIaAmqov8';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const client = createClient(SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testUser(email) {
  console.log(`\n========================================`);
  console.log(`TESTING USER: ${email}`);
  console.log(`========================================`);

  // 1. Generate magiclink token
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email
  });

  if (linkErr) {
    console.error('Error generating link:', linkErr);
    return;
  }

  const token_hash = linkData.properties?.hashed_token;

  // 2. Verify OTP to get session
  const { data: sessionData, error: sessionErr } = await client.auth.verifyOtp({
    token_hash,
    type: 'magiclink'
  });

  if (sessionErr) {
    console.error('Error verifying OTP:', sessionErr);
    return;
  }

  console.log('Successfully authenticated as:', email, '| User ID:', sessionData.user.id);

  const userClient = createClient(SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  });

  // 3. Test RPC get_my_tenants
  const { data: myTenants, error: rpcErr } = await userClient.rpc('get_my_tenants');
  console.log('RPC get_my_tenants result:', myTenants, 'Error:', rpcErr);

  // 4. Test Querying ordenes for LavAroma
  const tenantId = 'd3ed5a2a-ac67-47b3-9dfa-9bffad6baf68';
  const { data: ords, error: ordsErr } = await userClient
    .from('ordenes')
    .select('id,numero,empleado_id,total,creado_en')
    .eq('tenant_id', tenantId)
    .order('creado_en', { ascending: false })
    .limit(5);

  console.log(`Orders fetched count: ${ords?.length || 0}`, 'Error:', ordsErr);
  if (ords && ords.length > 0) {
    console.log('Sample orders:', ords.map(o => `${o.numero} (${o.empleado_id.slice(0,8)})`).join(', '));
  }

  // 5. Test Querying clientes
  const { data: clis, error: clisErr } = await userClient
    .from('clientes')
    .select('id,nombre')
    .eq('tenant_id', tenantId)
    .limit(3);
  console.log(`Clientes fetched count: ${clis?.length || 0}`, 'Error:', clisErr);

  // 6. Test Querying cajas
  const { data: cajas, error: cajasErr } = await userClient
    .from('cajas')
    .select('id,estado,monto_inicial')
    .eq('tenant_id', tenantId)
    .limit(3);
  console.log(`Cajas fetched count: ${cajas?.length || 0}`, 'Error:', cajasErr);
}

async function main() {
  await testUser('cajeralavaroma@gmail.com');
  await testUser('rosmeylinespinal63@gmail.com');
}

main().catch(console.error);
