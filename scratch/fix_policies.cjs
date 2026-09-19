const fs = require("fs");
const envFile = fs.readFileSync(".env", "utf-8");
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
async function sql(q) {
  const res = await fetch(url + "/pg/query", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": key, "Authorization": "Bearer " + key },
    body: JSON.stringify({ query: q })
  });
  return res.json();
}
async function run() {
  const fks = await sql("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE conrelid = 'public.gastos'::regclass AND contype = 'f'");
  console.log("FKs:", fks);
}
run();