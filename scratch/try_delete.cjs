const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const targetId = 'f34daf3d-ab21-482a-9d1a-e62e798693b1'; // Tenant "La"
  console.log("Intentando borrar tenant 'La'...");
  const { error } = await supabase.from('tenants').delete().eq('id', targetId);
  if (error) {
    console.error("Error al borrar tenant:", error);
  } else {
    console.log("Tenant borrado con éxito!");
  }
}

run();
