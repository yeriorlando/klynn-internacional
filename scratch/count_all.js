import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function check() {
  console.log("=== VERIFICANDO TABLAS DE CATALOGO (CON ANON KEY) ===");
  
  // count exact without filters
  const { count: catCount, error: catErr } = await supabase
    .from('catalogo_items')
    .select('*', { count: 'exact', head: true });

  if (catErr) {
    console.error("Error catalogo_items:", catErr.message);
  } else {
    console.log("Total rows in catalogo_items:", catCount);
  }

  const { count: srvCount, error: srvErr } = await supabase
    .from('servicios')
    .select('*', { count: 'exact', head: true });

  if (srvErr) {
    console.error("Error servicios:", srvErr.message);
  } else {
    console.log("Total rows in servicios:", srvCount);
  }
}

check();
