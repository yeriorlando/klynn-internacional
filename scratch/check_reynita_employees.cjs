const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const { data: emps, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('tenant_id', '8423be36-736f-4233-b933-1c1225042857');

  if (error) {
    console.error("Error fetching employees:", error);
  } else {
    console.log("Employees for Reynita:", emps);
  }
}

run();
