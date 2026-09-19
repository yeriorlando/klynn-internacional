const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function sql(q) {
  const res = await fetch(url + '/pg/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({ query: q })
  });
  return res.json();
}

async function run() {
  const tables = await sql("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('gastos', 'gasto_categorias', 'gasto_plantillas', 'clientes', 'ordenes');");
  console.log('Tables:', JSON.stringify(tables, null, 2));
  const policies = await sql("SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('gastos', 'gasto_categorias', 'gasto_plantillas');");
  console.log('Policies:', JSON.stringify(policies, null, 2));
}

run();
