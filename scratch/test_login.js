import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqtjwcphidbwiwrnqbac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0';

// Client to run queries
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const tenantId = '8423be36-736f-4233-b933-1c1225042857'; // Reynita
const email = 'test_cajero@klynn.com.do';
const password = 'TestPassword123!';

async function runTest() {
  console.log("1. Creando/registrando usuario de prueba en Auth...");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre: 'Test Cajero', tenant_id: tenantId, rol: 'VENDEDOR' } }
  });

  let userId = '';
  if (authError) {
    if (authError.message.includes("already registered") || authError.status === 422) {
      console.log("   Usuario ya registrado en Auth. Intentando iniciar sesión directamente...");
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        console.error("Error logging in:", loginError);
        return;
      }
      userId = loginData.user.id;
    } else {
      console.error("Error signing up:", authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log("   Usuario creado en Auth con ID:", userId);
  }

  console.log("2. Insertando/Upserteando en tabla empleados...");
  const { error: dbError } = await supabase.from('empleados').upsert({
    id: userId,
    tenant_id: tenantId,
    nombre: 'Test',
    apellido: 'Cajero',
    email,
    password: '***',
    rol: 'VENDEDOR',
    activo: true,
    permisos: ['nueva-orden', 'ordenes'],
    max_descuento_porcentaje: 10,
    creado_en: new Date().toISOString()
  });

  if (dbError) {
    console.error("Error inserting in empleados table:", dbError);
    return;
  }
  console.log("   Empleado guardado en la DB con éxito!");

  // Create an authenticated client to run queries as this user
  console.log("3. Creando cliente autenticado como el vendedor...");
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  const { error: signInErr } = await authClient.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error("Error signing in to authClient:", signInErr);
    return;
  }

  console.log("4. Probando consultas con RLS...");
  
  // Test 1: get_my_tenants
  console.log("   Llamando a public.get_my_tenants()...");
  const { data: myTenants, error: tenantErr } = await authClient.rpc('get_my_tenants');
  if (tenantErr) {
    console.error("Error running get_my_tenants RPC:", tenantErr);
  } else {
    console.log("   get_my_tenants() retorno:", myTenants);
  }

  // Test 2: Fetch catalogo_items
  console.log("   Consultando catalogo_items...");
  const { data: items, error: itemsErr } = await authClient
    .from('catalogo_items')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_id.eq.admin`);

  if (itemsErr) {
    console.error("Error fetching catalogo_items:", itemsErr);
  } else {
    console.log("   catalogo_items retorno:", items.length, "items.");
    if (items.length > 0) {
      console.log("   Primer item:", items[0].nombre, "de tenant:", items[0].tenant_id);
    }
  }

  // Test 3: Fetch servicios
  console.log("   Consultando servicios...");
  const { data: services, error: servicesErr } = await authClient
    .from('servicios')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_id.eq.admin`);

  if (servicesErr) {
    console.error("Error fetching servicios:", servicesErr);
  } else {
    console.log("   servicios retorno:", services.length, "items.");
  }
}

runTest();
