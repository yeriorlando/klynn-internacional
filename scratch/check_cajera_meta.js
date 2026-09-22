import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data: userRes } = await admin.auth.admin.getUserById('530b878d-86c3-4b97-b7da-22b084e7cc53');
  console.log('Cajera metadata:', userRes.user.user_metadata);
}

main().catch(console.error);
