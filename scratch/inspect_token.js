import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data: userRes } = await admin.auth.admin.getUserById('82f0a263-37f1-473f-8956-1f5b2338467d');
  console.log('User metadata keys:', Object.keys(userRes.user.user_metadata));
  for (const k of Object.keys(userRes.user.user_metadata)) {
    const val = JSON.stringify(userRes.user.user_metadata[k]);
    console.log(`Key: ${k} | Length: ${val.length}`);
    if (val.length > 500) {
      console.log(`Preview of ${k}:`, val.slice(0, 500));
    } else {
      console.log(`Value of ${k}:`, val);
    }
  }
}

main().catch(console.error);
