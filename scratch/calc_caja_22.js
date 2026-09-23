import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const tenantId = '776ef0f7-1e84-4e43-8d53-8e671e333005';
const cajaId = 'ff09dd33-c02d-4a1b-9801-b52ec27b397d';

async function run() {
  const { data: c } = await supabase.from('cajas').select('*').eq('id', cajaId).single();
  const { data: movs } = await supabase.from('movimientos_caja').select('*').eq('caja_id', cajaId);

  console.log('Caja:', c);
  let ventasEf = 0;
  let otrosIng = 0;
  let egresos = 0;
  let totalMovs = 0;

  for (const m of movs) {
    totalMovs += m.monto;
    if (m.tipo === 'VENTA' && m.metodo === 'EFECTIVO') ventasEf += m.monto;
    else if (m.tipo === 'INGRESO' || m.tipo === 'ABONO') otrosIng += m.monto;
    else if (['EGRESO', 'RETIRO', 'GASTO_CAJA_CHICA'].includes(m.tipo)) egresos += m.monto;
  }

  console.log(`Ventas Ef: ${ventasEf}`);
  console.log(`Otros Ingresos (raw): ${otrosIng}`);
  console.log(`Egresos: ${egresos}`);
  console.log(`Formula otrosIng - monto_inicial: ${otrosIng - (c.monto_inicial || 0)}`);
  console.log(`Formula efectivoEsperado: ${c.monto_inicial + ventasEf + (otrosIng - c.monto_inicial) - egresos}`);
  console.log(`Stored monto_esperado_efectivo: ${c.monto_esperado_efectivo}`);
  console.log(`Stored monto_contado_efectivo: ${c.monto_contado_efectivo}`);
  console.log(`Stored diferencia: ${c.diferencia}`);
}

run().catch(console.error);
