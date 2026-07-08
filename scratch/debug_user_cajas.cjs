const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];

const supabase = createClient(url, anonKey);

async function run() {
  const email = 'temp_debug_caja@klynn.com.do';
  const password = 'tempPassword123!';
  const tenantId = '8423be36-736f-4233-b933-1c1225042857'; // reynita

  console.log("1. Attempting login...");
  let { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });

  if (loginErr) {
    console.log("User does not exist, signing up...");
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      console.error("SignUp error:", signUpErr);
      return;
    }
    const userId = signUpData.user.id;
    console.log("Signed up user ID:", userId);

    // Insert into public.empleados
    console.log("Inserting employee record...");
    const { error: empErr } = await supabase.from('empleados').insert({
      id: userId,
      tenant_id: tenantId,
      nombre: "Temp Debug",
      email: email,
      rol: "ADMIN",
      activo: true,
      creado_en: new Date().toISOString()
    });

    if (empErr) {
      console.error("Employee insert error:", empErr);
      return;
    }
    console.log("Employee record inserted successfully!");

    // Login again
    let { data: newLoginData, error: newLoginErr } = await supabase.auth.signInWithPassword({ email, password });
    if (newLoginErr) {
      console.error("Login failed after signup:", newLoginErr);
      return;
    }
    loginData = newLoginData;
  }

  console.log("Logged in successfully. Access token present.");
  
  // Query cajas
  console.log("Querying cajas...");
  const { data: cajas, error: cajasErr } = await supabase.from('cajas').select('*').eq('tenant_id', tenantId);
  if (cajasErr) {
    console.error("Error fetching cajas:", cajasErr);
  } else {
    console.log(`Successfully fetched ${cajas.length} cajas for reynita:`);
    console.log(cajas);
  }

  // Clean up employee record
  console.log("Cleaning up temp user record...");
  const { error: deleteEmpErr } = await supabase.from('empleados').delete().eq('email', email);
  if (deleteEmpErr) {
    console.error("Failed to delete temp employee:", deleteEmpErr);
  } else {
    console.log("Temp employee record cleaned up.");
  }
}

run();
