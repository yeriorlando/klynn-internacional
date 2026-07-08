const { createClient } = require('@supabase/supabase-js');

const supabaseClient = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

// Mock getPlans logic from storage.ts
async function getPlansMock() {
  const { data, error } = await supabaseClient.from('planes').select('*').order('precio_mensual');
  if (!error && data && data.length > 0) {
    return data.map(p => ({
      id: p.id,
      nombre: p.nombre,
      precio_mensual: p.precio_mensual,
      precio_anual: p.precio_anual,
      limite_empleados: p.limite_empleados,
      limite_ordenes_mes: p.limite_ordenes_mes,
      modulos: {
        whatsapp: !!p.whatsapp,
        facturacion_fiscal: !!p.facturacion_fiscal,
        multisucursal: !!p.multisucursal,
        logistica: !!p.logistica
      },
      limite_whatsapp_mes: p.limite_whatsapp_mes || 0,
    }));
  }
  return [];
}

async function run() {
  const plans = await getPlansMock();
  console.log("Plans returned by getPlansMock:", JSON.stringify(plans, null, 2));

  const plan = plans.find(p => p.id === 'basico');
  console.log("Found plan for id 'basico':", plan);
  console.log("hasLogistica:", !!plan?.modulos?.logistica);
  console.log("hasWhatsApp:", !!plan?.modulos?.whatsapp);
}

run();
