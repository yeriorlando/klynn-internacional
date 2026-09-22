import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://api.klynn.com.do';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const tenantId = 'd3ed5a2a-ac67-47b3-9dfa-9bffad6baf68';
  const { data: tenants } = await admin.from('tenants').select('id, nombre, logo_url').eq('id', tenantId);
  const t = tenants[0];

  if (!t.logo_url || !t.logo_url.startsWith('data:image/')) {
    console.log('No base64 logo to migrate');
    return;
  }

  // Extract base64
  const match = t.logo_url.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    console.error('Invalid base64 format');
    return;
  }

  const mime = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mime.split('/')[1] || 'webp';
  const filePath = `logos/tenant-${tenantId}.${ext}`;

  console.log(`Uploading ${filePath} (${buffer.length} bytes) to 'assets' bucket...`);
  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('assets')
    .upload(filePath, buffer, {
      contentType: mime,
      upsert: true
    });

  if (uploadErr) {
    console.error('Upload error:', uploadErr);
    return;
  }

  const { data: { publicUrl } } = admin.storage.from('assets').getPublicUrl(filePath);
  console.log('Public URL generated:', publicUrl);

  // Test URL accessibility
  const checkRes = await fetch(publicUrl);
  console.log('Accessibility status:', checkRes.status, 'Content-Type:', checkRes.headers.get('content-type'));

  if (checkRes.ok) {
    // Update tenant logo_url
    const { error: updateErr } = await admin
      .from('tenants')
      .update({ logo_url: publicUrl })
      .eq('id', tenantId);

    if (updateErr) {
      console.error('Error updating tenant:', updateErr);
    } else {
      console.log(`✅ Lavanderia LavAroma logo_url successfully updated to: ${publicUrl}`);
    }
  }
}

main().catch(console.error);
