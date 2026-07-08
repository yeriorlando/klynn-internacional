const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  // Intentemos llamar a admin_delete_user con un ID inexistente
  const fakeUserId = "00000000-0000-0000-0000-000000000000";
  console.log("Probando llamada a admin_delete_user...");
  const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: fakeUserId });
  
  if (error) {
    console.error("Error al llamar a admin_delete_user:", error);
  } else {
    console.log("Llamada a admin_delete_user exitosa (o no dio error):", data);
  }
}

run();
