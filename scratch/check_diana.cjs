const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const email = "dianaperalta0616@gmail.com";
  console.log("Checking empleados table for email:", email);
  const { data: emps, error: empErr } = await supabase
    .from("empleados")
    .select("*")
    .ilike("email", email);

  console.log("Empleados in DB:", emps, "Error:", empErr);

  console.log("Testing signInWithPassword with Diana0616@...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password: "Diana0616@"
  });

  console.log("Auth Result:", { 
    user: authData?.user?.id, 
    confirmed_at: authData?.user?.email_confirmed_at,
    error: authErr 
  });
}

run();
