import { createClient } from '@supabase/supabase-js';

const url = 'https://lqtjwcphidbwiwrnqbac.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0';

const supabase = createClient(url, key);

async function test() {
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@klynn.com.do',
    password: '***' // Wait, I don't know the password...
  });

  // Try to upsert as anon just to see the exact error
  const { data, error } = await supabase.from('planes').upsert({
    id: 'basico',
    nombre: 'Básico',
    precio_mensual: 1300,
    precio_anual: 12000,
    limite_empleados: 2,
    limite_ordenes_mes: 300,
    whatsapp: true,
    facturacion_fiscal: true, // TRYING TO SET IT TRUE
    multisucursal: true,
    logistica: false,
    limite_whatsapp_mes: 300
  });
  console.log("Upsert Error:", error);
}

test();
