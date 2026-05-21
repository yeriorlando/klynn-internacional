import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lqtjwcphidbwiwrnqbac.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, name, phone, last_msg, time")
    .order("time", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Recent Conversations:", JSON.stringify(data, null, 2));
  }
}

check();
