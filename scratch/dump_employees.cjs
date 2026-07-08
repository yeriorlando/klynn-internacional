const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];

const supabase = createClient(url, anonKey);

async function run() {
  const { data: emps, error } = await supabase.from('empleados').select('*');
  if (error) {
    console.error("Error fetching employees:", error);
  } else {
    console.log("Employees found:", emps.map(e => ({ id: e.id, email: e.email, tenant_id: e.tenant_id, nombre: e.nombre, activo: e.activo })));
  }
}

run();
