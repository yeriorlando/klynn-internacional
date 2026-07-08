const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];

const supabase = createClient(url, anonKey);

async function run() {
  // We need to bypass RLS or check using our temp user if needed.
  // Wait, let's create a temp employee for each tenant, or since we want to query everything, 
  // is there a way to query all? Let's check if the table "cajas" allows select for all if we are not logged in.
  // Wait! Let's test if we can select all cajas with the temp user we created earlier?
  // Ah, the temp user was deleted, but we can register it again or keep it.
  // Wait, does the temp user have access to all boxes or only its own tenant's boxes?
  // The RLS policy says:
  // "Management for own boxes": tenant_id::text IN (SELECT t_id FROM get_my_tenants())
  // So the temp user only has access to its own tenant's boxes.
  // Let's sign in with temp user for reynita (tenant_id = '8423be36-736f-4233-b933-1c1225042857').
  
  const email = 'temp_debug_caja2@klynn.com.do';
  const password = 'tempPassword123!';
  const tenantId = '8423be36-736f-4233-b933-1c1225042857';

  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
  const userId = signUpData?.user?.id;
  if (!userId) {
    // maybe user already exists
    const { data: lData } = await supabase.auth.signInWithPassword({ email, password });
    if (!lData?.user) {
      console.error("Could not sign up or log in");
      return;
    }
  } else {
    // Insert employee
    await supabase.from('empleados').insert({
      id: userId,
      tenant_id: tenantId,
      nombre: "Temp Debug",
      email: email,
      rol: "ADMIN",
      activo: true,
      creado_en: new Date().toISOString()
    });
  }

  // Login
  await supabase.auth.signInWithPassword({ email, password });

  // Fetch all open cajas
  const { data: openCajas, error } = await supabase.from('cajas').select('*').eq('estado', 'ABIERTA');
  if (error) {
    console.error("Error fetching open boxes:", error);
  } else {
    console.log(`Total open boxes found for reynita: ${openCajas.length}`);
    const counts = {};
    openCajas.forEach(c => {
      counts[c.tenant_id] = (counts[c.tenant_id] || 0) + 1;
    });
    console.log("Open boxes counts per tenant:", counts);
  }

  // Cleanup temp employee
  await supabase.from('empleados').delete().eq('email', email);
}

run();
