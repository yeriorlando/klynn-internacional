import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function check() {
  console.log("=== EMPLEADOS EN LA DB ===");
  const { data: emps, error: empErr } = await supabase.from('empleados').select('*');
  if (empErr) {
    console.error("Error fetching employees:", empErr);
  } else {
    console.log(emps.map(e => ({ id: e.id, nombre: e.nombre, email: e.email, tenant_id: e.tenant_id, rol: e.rol })));
  }

  console.log("=== TENANTS EN LA DB ===");
  const { data: tenants, error: tenErr } = await supabase.from('tenants').select('*');
  if (tenErr) {
    console.error("Error fetching tenants:", tenErr);
  } else {
    console.log(tenants.map(t => ({ id: t.id, nombre: t.nombre, slug: t.slug })));
  }

  console.log("=== ITEMS EN CATALOGO ===");
  const { data: items, error: itemErr } = await supabase.from('catalogo_items').select('*', { count: 'exact', head: true });
  if (itemErr) {
    console.error("Error fetching catalog_items count:", itemErr);
  } else {
    console.log("Total items:", items);
  }
}

check();
