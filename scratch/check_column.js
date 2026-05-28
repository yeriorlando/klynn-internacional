import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqtjwcphidbwiwrnqbac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumn() {
  const { data, error } = await supabase
    .from('ordenes')
    .select('id, servicios_precios')
    .limit(1);

  if (error) {
    console.error('Error querying column:', error.message);
  } else {
    console.log('Success! Data returned:', data);
  }
}

checkColumn();
