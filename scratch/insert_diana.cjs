const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function check() {
  const tenantId = "41109a25-9e3f-4c9e-8221-2c0555df9cd8"; // LAVANDERIA MI CASA081
  const authUserId = "4a9e6147-0bb9-41b3-8158-ad49a707d715"; // Diana's auth id
  
  console.log("Checking empleados for tenant:", tenantId);
  const { data: emps } = await supabase.from("empleados").select("*").eq("tenant_id", tenantId);
  console.log("Current empleados in tenant:", emps);

  // Let's insert/upsert Diana with her Auth User ID so she is fully registered!
  const dianaEmpleado = {
    id: authUserId,
    tenant_id: tenantId,
    nombre: "Diana",
    apellido: "Peralta",
    email: "dianaperalta0616@gmail.com",
    password: "***",
    pin: "0000",
    rol: "VENDEDOR",
    activo: true,
    permisos: ["nueva-orden", "ordenes", "caja", "clientes"],
    max_descuento_porcentaje: 10,
    creado_en: new Date().toISOString()
  };

  console.log("Upserting Diana into empleados table...");
  const { data: upsertData, error: upsertErr } = await supabase.from("empleados").upsert(dianaEmpleado).select();
  console.log("Upsert result:", { upsertData, upsertErr });
}

check();
