const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function fixTenant() {
  const tenantId = "41109a25-9e3f-4c9e-8221-2c0555df9cd8";
  
  console.log("Updating tenant name and slug to match apartahotelylavanderia08...");
  const { data, error } = await supabase
    .from("tenants")
    .update({
      nombre: "Apartahotel y Lavanderia 081",
      slug: "apartahotelylavanderia08",
      direccion: "Duarte #33"
    })
    .eq("id", tenantId)
    .select();

  console.log("Tenant updated:", { data, error });

  // Now test login with slug 'apartahotelylavanderia08'
  console.log("Testing login via apartahotelylavanderia08...");
  const { data: tenant } = await supabase.from("tenants").select("*").eq("slug", "apartahotelylavanderia08").single();
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "dianaperalta0616@gmail.com",
    password: "Diana0616@"
  });
  const { data: emp } = await supabase.from("empleados").select("*").eq("id", auth?.user?.id).single();

  console.log("Check:", {
    tenantFound: tenant?.nombre,
    userAuthenticated: auth?.user?.email,
    authError: authErr,
    empleadoFound: emp?.nombre,
    matchTenant: emp?.tenant_id === tenant?.id
  });
}

fixTenant();
