const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

async function main() {
  const tenantId = 'd3ed5a2a-ac67-47b3-9dfa-9bffad6baf68';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}&select=id,nombre,slug,logo_url`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  const t = data[0];
  console.log('Tenant:', t.nombre);
  console.log('Has logo_url:', !!t.logo_url);
  console.log('logo_url type:', t.logo_url?.slice(0, 40));
  console.log('logo_url total length:', t.logo_url?.length);
}

main().catch(console.error);
