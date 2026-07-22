import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function check() {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', 'reynita')
    .maybeSingle();

  if (error) {
    console.error("Error fetching tenant:", error);
  } else {
    console.log("=== TENANT REYNITA ===");
    console.log(JSON.stringify(tenant, null, 2));
  }
}

check();
