import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function testFetch() {
  const tenant_id = '8423be36-736f-4233-b933-1c1225042857';
  const { data, error } = await supabase
    .from('catalogo_items')
    .select('*')
    .or(`tenant_id.eq.${tenant_id},tenant_id.eq.admin`);

  if (error) {
    console.error("Error fetching items:", error);
  } else {
    console.log("Success! Items returned:", data.length);
    if (data.length > 0) {
      console.log("First item:", data[0]);
    }
  }
}

testFetch();
