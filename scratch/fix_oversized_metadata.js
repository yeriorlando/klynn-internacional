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
    const meta = u.user_metadata || {};
    let needsUpdate = false;

    // Check if tenant_logo_url is base64 data
    if (meta.tenant_logo_url && typeof meta.tenant_logo_url === 'string' && meta.tenant_logo_url.startsWith('data:')) {
      console.log(`Cleaning tenant_logo_url for user ${u.email} (${u.id})...`);
      delete meta.tenant_logo_url;
      needsUpdate = true;
    }

    // Check if any other key has base64 data > 500 chars
    for (const k of Object.keys(meta)) {
      if (typeof meta[k] === 'string' && meta[k].startsWith('data:')) {
        console.log(`Cleaning ${k} for user ${u.email}...`);
        delete meta[k];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const { error } = await admin.auth.admin.updateUserById(u.id, {
        user_metadata: meta
      });
      if (error) {
        console.error(`Error updating user ${u.email}:`, error);
      } else {
        console.log(`✅ Successfully cleaned metadata for ${u.email}. New size: ${JSON.stringify(meta).length} chars.`);
      }
    }
  }
}

main().catch(console.error);
