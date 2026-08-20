const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  console.log("Searching all empleados with diana or peralta...");
  const { data: emps, error: empErr } = await supabase
    .from("empleados")
    .select("*")
    .or("nombre.ilike.%diana%,apellido.ilike.%peralta%,email.ilike.%diana%");

  console.log("Found empleados:", emps);

  const { data: tenants } = await supabase.from("tenants").select("id, nombre, slug");
  console.log("Tenants:", tenants);
}

run();
