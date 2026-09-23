import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

const cajaId = 'ff09dd33-c02d-4a1b-9801-b52ec27b397d';
const duplicateMovIds = [
  'ed350bd4-b21d-4218-9040-fbe7eed11e1c', // 0191 - $800 - 02:11:15 UTC
  '16749522-199b-4459-bc18-676451240516', // 0064 - $900 - 02:11:55 UTC
  'f1351af4-d2e0-4cff-b50f-374acce6da42', // 0208 - $180 - 02:12:57 UTC
  '8d78b73f-988f-42c8-867f-54d5baca995b', // 0209 - $510 - 03:02:38 UTC
  '504d83dc-6c45-4a81-be3c-089440d56e38', // 0100 - $500 - 03:03:35 UTC
];

async function run() {
  console.log('=== 1. VERIFICANDO REGISTROS A ELIMINAR ===');
  for (const id of duplicateMovIds) {
    const { data, error } = await supabase.from('movimientos_caja').select('*').eq('id', id).single();
    if (error || !data) {
      console.log(`ID ${id}: NO encontrado o ya eliminado.`);
    } else {
      console.log(`ID ${id}: ${data.concepto} | Monto: $${data.monto} | Creado: ${data.creado_en}`);
    }
  }

  console.log('\n=== 2. ELIMINANDO 5 MOVIMIENTOS DUPLICADOS ===');
  const { data: delResult, error: delErr } = await supabase
    .from('movimientos_caja')
    .delete()
    .in('id', duplicateMovIds)
    .select();

  if (delErr) {
    console.error('Error al eliminar movimientos:', delErr);
    return;
  }
  console.log(`Eliminados exitosamente: ${delResult?.length} movimientos.`);

  console.log('\n=== 3. RECALCULANDO TOTALES DE CAJA ===');
  const { data: remainingMovs, error: movErr } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('caja_id', cajaId)
    .order('creado_en', { ascending: true });

  if (movErr) {
    console.error('Error al obtener movimientos restantes:', movErr);
    return;
  }

  console.log(`Total movimientos legítimos restantes: ${remainingMovs.length}`);
  let totalEfectivoEntradas = 0;
  let totalEfectivoSalidas = 0;

  for (const m of remainingMovs) {
    console.log(`  [${m.creado_en}] ${m.tipo} | $${m.monto} | ${m.metodo || 'N/A'} | ${m.concepto}`);
    if (m.metodo === 'EFECTIVO') {
      if (m.tipo === 'VENTA' || m.tipo === 'ABONO' || m.tipo === 'INGRESO') {
        totalEfectivoEntradas += Number(m.monto || 0);
      } else if (m.tipo === 'EGRESO' || m.tipo === 'GASTO') {
        totalEfectivoSalidas += Number(m.monto || 0);
      }
    }
  }

  const { data: c } = await supabase.from('cajas').select('*').eq('id', cajaId).single();
  const montoInicial = Number(c.monto_inicial || 0);
  const nuevoMontoEsperado = montoInicial + totalEfectivoEntradas - totalEfectivoSalidas;
  const montoContado = Number(c.monto_contado_efectivo || 0);
  // Contado fue 5975, que coincide exactamente con las ventas en efectivo (5975).
  // Si la cajera no sumó los 400 de apertura, la diferencia es -400.
  const nuevaDiferencia = montoContado - nuevoMontoEsperado;

  console.log('\n=== 4. ACTUALIZANDO REGISTRO DE CAJA ===');
  console.log(`Monto inicial: RD$ ${montoInicial}`);
  console.log(`Total ventas efectivo legítimas: RD$ ${totalEfectivoEntradas}`);
  console.log(`Nuevo monto esperado efectivo: RD$ ${nuevoMontoEsperado} (anterior: RD$ ${c.monto_esperado_efectivo})`);
  console.log(`Monto contado por cajera: RD$ ${montoContado}`);
  console.log(`Nueva diferencia: RD$ ${nuevaDiferencia} (anterior: RD$ ${c.diferencia})`);

  const { error: updateErr } = await supabase
    .from('cajas')
    .update({
      monto_esperado_efectivo: nuevoMontoEsperado,
      diferencia: nuevaDiferencia,
      notas_cierre: 'FACTURAS DUPLICADAS CORREGIDAS (Auditoría Klynn)',
    })
    .eq('id', cajaId);

  if (updateErr) {
    console.error('Error al actualizar caja:', updateErr);
  } else {
    console.log('Caja actualizada exitosamente ✅');
  }

  console.log('\n=== 5. VERIFICANDO ÓRDENES AFECTADAS ===');
  const ordIds = [
    '118ec041-a7d5-4189-afe1-f96d9dd21c3b', // 0100
    '7a0074d4-9aeb-407d-b46e-6bcabbf73c5f', // 0191
    '8a5facab-331d-4948-bb7d-7e1494b189a4', // 0064
    '7ba3bee0-861d-4062-9536-95036d3884e8', // 0208
    'a7be942f-0c34-4f4e-b034-dbce9ea196fc', // 0209
  ];
  for (const oId of ordIds) {
    const { data: o } = await supabase.from('ordenes').select('id, numero, total, pagado, saldo, estado').eq('id', oId).single();
    console.log(`Orden ${o.numero}: Total $${o.total}, Pagado $${o.pagado}, Saldo $${o.saldo}, Estado: ${o.estado}`);
  }
}

run().catch(console.error);
