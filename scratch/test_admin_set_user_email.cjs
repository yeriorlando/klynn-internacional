const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const targetId = "d13ef7f6-549b-40be-846c-65fb173318b6";
  const { data, error } = await supabase.rpc('admin_set_user_email', {
    target_user_id: targetId,
    new_email: "demo@klynn.com.do"
  });
  console.log("admin_set_user_email call result:", { data, error });
}

run();
