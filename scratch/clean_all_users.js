import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  console.log(`Checking ${users.length} users for tenant_logo_url nullification...`);

  for (const u of users) {
    const meta = u.user_metadata || {};
    if (meta.tenant_logo_url) {
      console.log(`Setting tenant_logo_url: null for ${u.email}...`);
      await admin.auth.admin.updateUserById(u.id, {
        user_metadata: {
          tenant_logo_url: null
        }
      });
      console.log(`✓ Cleaned ${u.email}`);
    }
  }

  console.log('\n--- VERIFICATION OF ALL USERS METADATA SIZE ---');
  const { data: { users: recheck } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of recheck) {
    const metaStr = JSON.stringify(u.user_metadata || {});
    if (metaStr.length > 1000) {
      console.log(`⚠️ Still oversized: ${u.email} (${metaStr.length} chars)`);
    }
  }
  console.log('All users check finished.');
}

main().catch(console.error);
