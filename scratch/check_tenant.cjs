const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function sql(q) {
  const res = await fetch(url + '/pg/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ query: q })
  });
  return res.json();
}

async function run() {
  const tenants = await sql("SELECT id, slug, nombre FROM tenants WHERE slug = 'reynita';");
  console.log('Tenant:', tenants);
  if (tenants && tenants[0]) {
    const tid = tenants[0].id;
    const cats = await sql(`SELECT count(*) FROM gasto_categorias WHERE tenant_id = '${tid}';`);
    const gastos = await sql(`SELECT count(*) FROM gastos WHERE tenant_id = '${tid}';`);
    const plantillas = await sql(`SELECT count(*) FROM gasto_plantillas WHERE tenant_id = '${tid}';`);
    console.log('Counts:', { cats, gastos, plantillas });
  }
}
run();
