const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function test() {
  console.log("Testing signUp for dianaperalta0616@gmail.com...");
  const tempClient = createClient(
    "https://lqtjwcphidbwiwrnqbac.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await tempClient.auth.signUp({
    email: "dianaperalta0616@gmail.com",
    password: "Diana0616@",
    options: {
      data: {
        nombre: "Diana",
        tenant_id: "41109a25-9e3f-4c9e-8221-2c0555df9cd8",
        rol: "VENDEDOR"
      }
    }
  });

  console.log("SignUp response:", { user: data?.user?.id, error });

  if (data?.user) {
    console.log("Calling admin_set_user_email RPC to confirm email...");
    const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_set_user_email", {
      target_user_id: data.user.id,
      new_email: "dianaperalta0616@gmail.com"
    });
    console.log("admin_set_user_email RPC response:", { rpcData, rpcErr });
  }

  console.log("Now testing signInWithPassword...");
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: "dianaperalta0616@gmail.com",
    password: "Diana0616@"
  });

  console.log("SignIn response:", { user: loginData?.user?.id, error: loginErr });
}

test();
