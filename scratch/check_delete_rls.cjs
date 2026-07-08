const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const crypto = require('crypto');
  const testId = crypto.randomUUID();
  console.log("Insertando tenant prueba:", testId);
  const { data: insertData, error: insertErr } = await supabase
    .from('tenants')
    .insert({
      id: testId,
      nombre: "Test Tenant Elimination",
      slug: "test-elimination-" + Date.now(),
      color_primario: "#0F4C81",
      color_secundario: "#334155",
      plan_id: "basico",
      estado: "TRIAL",
      telefono: "809-000-0000",
      email: "test@elimination.com",
      trial_hasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select();

  if (insertErr) {
    console.error("Error al insertar tenant:", insertErr);
    return;
  }
  console.log("Tenant insertado con éxito:", insertData);

  // 2. Intentar eliminar el tenant insertado
  console.log("Eliminando tenant prueba:", testId);
  const { error: deleteErr } = await supabase
    .from('tenants')
    .delete()
    .eq('id', testId);

  if (deleteErr) {
    console.error("Error al eliminar tenant:", deleteErr);
  } else {
    console.log("Tenant eliminado con éxito!");
  }
}

run();
