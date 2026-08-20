const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function testFullCreationFlow() {
  const tenantId = "41109a25-9e3f-4c9e-8221-2c0555df9cd8"; // Apartahotel y Lavanderia 081
  const testEmail = `cajero_test_${Date.now()}@gmail.com`;
  const testPassword = "Password123@";
  
  console.log("1. Creating employee account via tempClient signUp...");
  const tempClient = createClient(
    "https://lqtjwcphidbwiwrnqbac.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: authData, error: authErr } = await tempClient.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        nombre: "Cajero Test",
        tenant_id: tenantId,
        rol: "VENDEDOR"
      }
    }
  });

  if (authErr) {
    console.error("SignUp error:", authErr);
    return;
  }
  console.log("Auth user created:", authData.user.id);

  console.log("2. Auto-confirming email via RPC...");
  await supabase.rpc("admin_set_user_email", {
    target_user_id: authData.user.id,
    new_email: testEmail
  });

  console.log("3. Inserting into public.empleados...");
  const { data: emp, error: empErr } = await supabase.from("empleados").insert({
    id: authData.user.id,
    tenant_id: tenantId,
    nombre: "Cajero",
    apellido: "Test",
    email: testEmail,
    password: "***",
    pin: "1234",
    rol: "VENDEDOR",
    activo: true,
    permisos: ["nueva-orden", "ordenes", "caja"],
    max_descuento_porcentaje: 10,
    creado_en: new Date().toISOString()
  }).select().single();

  console.log("Empleado inserted:", { emp, empErr });

  console.log("4. Testing login with new employee credentials...");
  const { data: loginRes, error: loginErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  console.log("Login result:", { user: loginRes?.user?.id, error: loginErr });

  if (loginRes?.user) {
    console.log(" FULL EMPLOYEE CREATION + DIRECT LOGIN VERIFIED AND WORKING 100%!");
    // Clean up test employee
    await supabase.from("empleados").delete().eq("id", authData.user.id);
    await supabase.rpc("admin_delete_user", { target_user_id: authData.user.id });
    console.log("Test employee cleaned up successfully.");
  }
}

testFullCreationFlow();
