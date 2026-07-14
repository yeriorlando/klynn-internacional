const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://lqtjwcphidbwiwrnqbac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0"
);

async function run() {
  const numeroOrden = 'KL-202607-0008';
  console.log(`Buscando orden ${numeroOrden}...`);
  
  const { data: orden, error: errFetch } = await supabase
    .from('ordenes')
    .select('*')
    .eq('numero', numeroOrden)
    .single();

  if (errFetch) {
    console.error("Error al buscar orden:", errFetch);
    return;
  }

  console.log("Orden encontrada:", orden);

  console.log("Intentando condonar deuda (actualizar saldo a 0 y estado a PAGADA)...");
  
  const ordenActualizada = {
    ...orden,
    saldo: 0,
    estado: orden.estado === 'ENTREGADA' ? 'ENTREGADA' : 'PAGADA',
    notas: orden.notas ? `${orden.notas} | Deuda condonada: Test` : 'Deuda condonada: Test'
  };

  const { data: updateRes, error: errUpdate } = await supabase
    .from('ordenes')
    .upsert(ordenActualizada)
    .select();

  if (errUpdate) {
    console.error("Error al actualizar la orden:", errUpdate);
  } else {
    console.log("Orden actualizada con éxito:", updateRes);
  }
}

run();
