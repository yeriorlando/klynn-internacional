import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

function extractNum(numero) {
  if (!numero || typeof numero !== 'string') return null;
  const match = numero.match(/-(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function computeRobustNext(numbers) {
  const sorted = [
    ...new Set(numbers.filter((n) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0)),
  ].sort((a, b) => b - a); // descending: largest first

  if (sorted.length === 0) return 1;
  if (sorted.length === 1) return sorted[0] > 50000 ? 1 : sorted[0] + 1;

  // Filter isolated outliers (e.g. an isolated jump > 100 above the previous number)
  let idx = 0;
  while (idx < sorted.length - 1) {
    const highest = sorted[idx];
    const secondHighest = sorted[idx + 1];
    if (highest - secondHighest > 100) {
      console.log(`  [Outlier detectado]: ${highest} vs ${secondHighest}`);
      idx++;
    } else {
      break;
    }
  }

  return sorted[idx] + 1;
}

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id, nombre, slug');
  for (const t of tenants || []) {
    const { data: ords } = await supabase
      .from('ordenes')
      .select('numero, creado_en')
      .eq('tenant_id', t.id)
      .order('creado_en', { ascending: false })
      .limit(1000);

    if (!ords || ords.length === 0) continue;
    const nums = ords.map((o) => extractNum(o.numero)).filter(Boolean);
    const next = computeRobustNext(nums);
    console.log(`Tenant: ${t.nombre} (${t.slug})`);
    console.log(`  Total órdenes analizadas: ${ords.length}`);
    console.log(`  Últimas 3 órdenes: ${ords.slice(0, 3).map((o) => o.numero).join(', ')}`);
    console.log(`  Próximo número calculado: ${next}`);
  }
}

run().catch(console.error);
