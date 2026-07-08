const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function check() {
  const tenantId = '8423be36-736f-4233-b933-1c1225042857';
  
  const { data: allCajas, error: err1 } = await supabase
    .from('cajas')
    .select('*')
    .eq('tenant_id', tenantId);
    
  if (err1) {
    console.error("Error fetching all boxes:", err1);
  } else {
    console.log(`Total boxes found for reynita: ${allCajas.length}`);
    console.log("Last 5 boxes:", allCajas.slice(-5));
  }

  const { data: openCaja, error: err2 } = await supabase
    .from('cajas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estado', 'ABIERTA');
    
  if (err2) {
    console.error("Error fetching open box:", err2);
  } else {
    console.log("Open boxes:", openCaja);
  }
}

check();
