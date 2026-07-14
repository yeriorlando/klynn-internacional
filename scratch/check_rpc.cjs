const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const fakeUserId = "d13ef7f6-549b-40be-846c-65fb173318b6";
  console.log("Testing calling admin_set_user_password...");
  const { data: data1, error: error1 } = await supabase.rpc('admin_set_user_password', { 
    target_user_id: fakeUserId,
    new_password: "NewPassword123"
  });
  console.log("admin_set_user_password Result:", { data1, error1 });

  console.log("Testing calling admin_delete_user...");
  const { data: data2, error: error2 } = await supabase.rpc('admin_delete_user', {
    target_user_id: "00000000-0000-0000-0000-000000000000"
  });
  console.log("admin_delete_user Result:", { data2, error2 });
}

run();
