import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lqtjwcphidbwiwrnqbac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
);

async function check() {
  console.log("=== LISTING ALL SCHEMAS/TABLES VIA RPC OR SYSTEM TABLES ===");
  
  // We can query supabase REST API to list files or other structures, but wait, does PostgREST expose a schema endpoint?
  // Yes! PostgREST exposes the OpenAPI spec at the root path.
  // We can query that by doing a fetch request to the supabase URL!
  try {
    const res = await fetch('https://lqtjwcphidbwiwrnqbac.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0'
      }
    });
    const schema = await res.json();
    console.log("Tables found in API spec:", Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error("Error fetching schema:", err);
  }
}

check();
