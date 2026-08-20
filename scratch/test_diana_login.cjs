const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function testLogin() {
  const email = "dianaperalta0616@gmail.com";
  const password = "Diana0616@";
  const slug = "lavanderiamicasa081";

  console.log("1. Authenticating with signInWithPassword...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("Auth result:", { user: authData?.user?.id, email: authData?.user?.email, error: authError });

  console.log("2. Fetching tenant by slug:", slug);
  const { data: tenant } = await supabase.from("tenants").select("*").eq("slug", slug).single();
  console.log("Tenant:", tenant?.nombre, "ID:", tenant?.id);

  console.log("3. Fetching empleado profile with ID:", authData?.user?.id);
  const { data: emp } = await supabase.from("empleados").select("*").eq("id", authData?.user?.id).single();
  console.log("Empleado profile:", emp);

  if (emp && emp.activo && emp.tenant_id === tenant?.id) {
    console.log(" SUCCESS! Diana Peralta can log in successfully to", tenant.nombre);
  } else {
    console.error(" Login check failed!");
  }
}

testLogin();
