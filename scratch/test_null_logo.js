import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const userId = '82f0a263-37f1-473f-8956-1f5b2338467d';
  console.log('Explicitly setting tenant_logo_url to null...');
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      tenant_logo_url: null
    }
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Updated user_metadata:', data.user.user_metadata);
  }
}

main().catch(console.error);
