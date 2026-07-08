const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function check() {
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', 'reynita')
    .single();

  if (tErr) {
    console.error("Error fetching tenant:", tErr);
    return;
  }

  console.log("Tenant Reynita details:", tenant);

  const { data: plan, error: pErr } = await supabase
    .from('planes')
    .select('*')
    .eq('id', tenant.plan_id)
    .single();

  if (pErr) {
    console.error("Error fetching plan:", pErr);
    return;
  }

  console.log("Plan details:", plan);
}

check();
