const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];

const supabase = createClient(url, anonKey);

async function run() {
  const email = 'temp_debug_caja3@klynn.com.do';
  const password = 'tempPassword123!';
  const tenantId = '8423be36-736f-4233-b933-1c1225042857';

  // Log in or sign up
  const { data: signUpData } = await supabase.auth.signUp({ email, password });
  const userId = signUpData?.user?.id;
  if (userId) {
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

  await supabase.auth.signInWithPassword({ email, password });

  // Get all open cajas for reynita
  const { data: openCajas, error } = await supabase
    .from('cajas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estado', 'ABIERTA')
    .order('abierta_en', { ascending: false });

  if (error) {
    console.error("Error fetching open boxes:", error);
    return;
  }

  console.log(`Found ${openCajas.length} open boxes.`);

  if (openCajas.length <= 1) {
    console.log("No duplicate open boxes to close.");
  } else {
    // Keep the first one (index 0, latest) open. Close the rest.
    const latest = openCajas[0];
    const duplicates = openCajas.slice(1);
    console.log(`Keeping open box ID: ${latest.id} (opened at ${latest.abierta_en})`);
    
    for (const c of duplicates) {
      console.log(`Closing box ID: ${c.id} (opened at ${c.abierta_en})`);
      const { error: updateErr } = await supabase
        .from('cajas')
        .update({
          estado: 'CERRADA',
          cerrada_en: c.abierta_en,
          monto_esperado_efectivo: c.monto_inicial,
          monto_contado_efectivo: c.monto_inicial,
          diferencia: 0,
          notas_cierre: 'Cierre automático por corrección de sistema'
        })
        .eq('id', c.id);

      if (updateErr) {
        console.error(`Error closing box ${c.id}:`, updateErr);
      } else {
        console.log(`Successfully closed box ${c.id}`);
      }
    }
  }

  // Cleanup temp employee
  await supabase.from('empleados').delete().eq('email', email);
}

run();
