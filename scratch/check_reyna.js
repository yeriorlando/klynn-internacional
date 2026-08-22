import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

function extractOrderSeq(numero) {
  if (!numero || typeof numero !== "string") return null;
  const match = numero.match(/-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

function computeNextSequence(numbers) {
  const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n) && n > 0).sort((a, b) => b - a);
  if (valid.length === 0) return 1;

  // Si solo hay un número
  if (valid.length === 1) {
    // Si el único número es absurdamente alto sin historial (e.g. > 5000), empezamos en 1
    return valid[0] > 5000 ? 1 : valid[0] + 1;
  }

  // Filtrar posibles outliers aislados (un pico gigantesco aislado sin órdenes previas cercanas)
  let maxValid = valid[0];
  if (valid.length >= 2) {
    const highest = valid[0];
    const secondHighest = valid[1];
    // Si el más alto salta más de 100 números respecto al segundo más alto sin justificación
    if (highest - secondHighest > 100) {
      console.warn(`[OrderSeq] Outlier detectado: ${highest} (segundo más alto: ${secondHighest}). Descartando pico.`);
      maxValid = secondHighest;
    }
  }

  return maxValid + 1;
}

async function check() {
  const tenants = [
    { name: 'Reynita', id: '8423be36-736f-4233-b933-1c1225042857' },
    { name: 'MR Lavanderia Express', id: '776ef0f7-1e84-4e43-8d53-8e671e333005' },
    { name: 'LavAroma', id: 'd3ed5a2a-ac67-47b3-9dfa-9bffad6baf68' }
  ];

  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;

  for (const t of tenants) {
    const { data: ords } = await supabase
      .from('ordenes')
      .select('numero, creado_en')
      .eq('tenant_id', t.id)
      .order('creado_en', { ascending: false })
      .limit(30);

    const seqNums = (ords || []).map(o => extractOrderSeq(o.numero)).filter(Boolean);
    const nextSeq = computeNextSequence(seqNums);
    const nextFormatted = `KL-${ym}-${String(nextSeq).padStart(4, "0")}`;

    console.log(`=== TENANT: ${t.name} ===`);
    console.log(`  Últimas órdenes:`, ords?.slice(0, 3).map(o => o.numero));
    console.log(`  Próxima orden calculada: ${nextFormatted}`);
  }
}

check();

