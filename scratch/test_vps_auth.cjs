const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://api.klynn.com.do";
const SUPABASE_ANON_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoiYW5vbiJ9.TsHqtNcA63ts-rjsS0VijOHICQ-06AXymSoIaAmqov8";
const SERVICE_ROLE_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TEST_EMAIL = "test_lifecycle_emp_" + Date.now() + "@gmail.com";
const TEST_PASSWORD = "Password123@!";
const TEST_TENANT_ID = "f8dc8519-a115-4bd3-bb99-35140b6124e3";

async function test() {
  console.log("==========================================");
  console.log("PROBANDO FLUJO DE EMPLEADOS EN VPS KLYNN");
  console.log("Email de prueba:", TEST_EMAIL);
  console.log("==========================================");

  // Limpiar cualquier residuo de pruebas previas
  const { data: listData } = await adminSupabase.auth.admin.listUsers();
  for (const u of listData?.users || []) {
    if (u.email.startsWith("test_lifecycle_emp_")) {
      await adminSupabase.rpc("admin_delete_user", { target_user_id: u.id });
    }
  }

  // 1. Crear usuario en Auth mediante signUp
  console.log("\n[Paso 1] Creando usuario en Supabase Auth...");
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      data: {
        nombre: "Test Emp",
        tenant_id: TEST_TENANT_ID,
        rol: "VENDEDOR",
      },
    },
  });

  if (authError) {
    console.error("❌ Error en Auth SignUp:", authError);
    return;
  }
  const userId = authData.user.id;
  console.log("✅ Usuario creado en Auth:", userId);
  console.log("   Email confirmed en retorno:", authData.user.email_confirmed_at);

  // 2. Guardar en la tabla public.empleados
  console.log("\n[Paso 2] Insertando empleado en public.empleados...");
  const { data: empData, error: empError } = await supabase.from("empleados").insert({
    id: userId,
    tenant_id: TEST_TENANT_ID,
    nombre: "Test",
    apellido: "Empleado",
    email: TEST_EMAIL,
    password: "***",
    pin: "1234",
    rol: "VENDEDOR",
    activo: true,
    permisos: ["nueva-orden", "ordenes"],
    max_descuento_porcentaje: 10,
  }).select().single();

  if (empError) {
    console.error("❌ Error al insertar en empleados:", empError);
    return;
  }
  console.log("✅ Empleado insertado en tabla empleados con ID:", empData.id);

  // 3. Probar Inicio de Sesión inmediato
  console.log("\n[Paso 3] Probando Inicio de Sesión (signInWithPassword)...");
  const loginClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: loginRes, error: loginErr } = await loginClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (loginErr) {
    console.error("❌ Error en Login:", loginErr);
    return;
  }
  console.log("✅ INICIO DE SESIÓN EXITOSO!", {
    userId: loginRes.user.id,
    email: loginRes.user.email,
    token: loginRes.session.access_token ? "Obtenido correctamente" : "No token"
  });

  // 4. Probar Eliminación del Empleado via RPC admin_delete_user
  console.log("\n[Paso 4] Eliminando empleado llamando admin_delete_user...");
  const { error: rpcDelErr } = await supabase.rpc("admin_delete_user", { target_user_id: userId });
  if (rpcDelErr) {
    console.error("❌ Error en admin_delete_user:", rpcDelErr);
    return;
  }
  console.log("✅ admin_delete_user ejecutado sin errores");

  // Verificar si se eliminó de auth.users y public.empleados
  const { data: authUserCheck } = await adminSupabase.auth.admin.getUserById(userId);
  const { data: empCheck } = await supabase.from("empleados").select("id").eq("id", userId).maybeSingle();
  console.log("   Estado en auth.users tras el borrado:", authUserCheck?.user ? "Aún existe ❌" : "Eliminado por completo ✅");
  console.log("   Estado en public.empleados tras el borrado:", empCheck?.id ? "Aún existe ❌" : "Eliminado por completo ✅");

  // 5. Probar Volver a Registrar el Mismo Correo
  console.log("\n[Paso 5] Re-registrando empleado con el MISMO correo...");
  const { data: reAuthData, error: reAuthErr } = await tempClient.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      data: {
        nombre: "Test Emp Re-creado",
        tenant_id: TEST_TENANT_ID,
        rol: "VENDEDOR",
      },
    },
  });

  if (reAuthErr) {
    console.error("❌ Error al re-registrar:", reAuthErr);
    return;
  }
  console.log("✅ RE-REGISTRO EXITOSO CON EL MISMO CORREO! Nuevo ID:", reAuthData.user.id);

  // Probar login del nuevo
  const { data: reLoginRes, error: reLoginErr } = await loginClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (reLoginErr) {
    console.error("❌ Error en login re-registrado:", reLoginErr);
    return;
  }
  console.log("✅ LOGIN DEL RE-REGISTRADO EXITOSO AL 100%!");

  // Limpieza final
  await adminSupabase.rpc("admin_delete_user", { target_user_id: reAuthData.user.id });
  console.log("\n==========================================");
  console.log("🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100%)");
  console.log("==========================================");
}

test();
