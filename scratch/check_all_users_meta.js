import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  console.log(`Checking ${users.length} users for oversized metadata...`);
  for (const u of users) {
    const metaStr = JSON.stringify(u.user_metadata || {});
    if (metaStr.length > 1000) {
      console.log(`⚠️ User: ${u.email} | ID: ${u.id} | Metadata size: ${metaStr.length} chars`);
    }
  }
}

main().catch(console.error);
