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

/**
 * Calcula el siguiente número de orden:
 * - Para MR Lavandería Express (que superó las 1,000 órdenes y en agosto llegó a 1,262),
 *   continúa en 1,263 para no chocar con junio (67..429).
 * - Para todas las demás lavanderías (volumen normal < 500 órdenes),
 *   continúa de forma 100% natural a partir de su última orden creada (ej: 47 -> 48, 181 -> 182).
 * - Al pasar a octubre, noviembre, etc., ninguna lavandería reinicia a 1; todas siguen su curso.
 */
function computeNextSequence(orderedNums) {
  if (!orderedNums || orderedNums.length === 0) return 1;

  // El número de la orden más reciente
  const latest = orderedNums[0] || 0;

  // Verificar si es un tenant de alto volumen histórico (MR Lavandería Express, > 50 órdenes con número >= 1000)
  const isHistoricalHighVolume = orderedNums.filter((n) => n >= 1000 && n < 20000).length >= 50;

  if (isHistoricalHighVolume) {
    const validHigh = orderedNums.filter((n) => n < 20000);
    const maxHistorical = Math.max(...validHigh);
    return Math.max(maxHistorical, latest) + 1;
  }

  // Para todas las demás lavanderías, continuar naturalmente desde su última orden activa
  return latest + 1;
}

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id, nombre, slug');
  const d = new Date();
  const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');

  for (const t of tenants || []) {
    const { data: ords } = await supabase
      .from('ordenes')
      .select('numero, creado_en')
      .eq('tenant_id', t.id)
      .order('creado_en', { ascending: false })
      .limit(1000);

    if (!ords || ords.length === 0) continue;
    const nums = ords.map((o) => extractNum(o.numero)).filter(Boolean);
    const next = computeNextSequence(nums);
    const nextTicket = `KL-${ym}-${String(next).padStart(4, '0')}`;
    console.log(`Tenant: ${t.nombre} (${t.slug})`);
    console.log(`  Última orden creada en sistema: ${ords[0].numero}`);
    console.log(`  Próxima orden que saldrá:       ${nextTicket}`);
  }
}

run().catch(console.error);
