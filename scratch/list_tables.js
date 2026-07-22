import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function check() {
  console.log("=== TOTALS FOR ALL TABLES ===");
  const tables = ['tenants', 'empleados', 'clientes', 'ordenes', 'catalogo_items', 'servicios', 'cajas', 'movimientos_caja', 'gastos'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`Table ${table}: Error - ${error.message}`);
    } else {
      console.log(`Table ${table}: ${count} rows`);
    }
  }
}

check();
