import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://api.klynn.com.do',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTQ1NDMyMCwiZXhwIjo0OTQxMTI3OTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9RlBb0GvEJl6f1XWJMArbCdYqCas0RVexQhT5O3X_cI'
);

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id, nombre, slug');
  for (const t of tenants || []) {
    const { data: ords } = await supabase
      .from('ordenes')
      .select('numero')
      .eq('tenant_id', t.id)
      .order('creado_en', { ascending: false })
      .limit(500);

    if (!ords || ords.length === 0) continue;
    const nums = ords
      .map((o) => {
        const m = (o.numero || '').match(/-(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n) => n !== null);

    if (nums.length > 0) {
      console.log(
        `${t.nombre} (${t.slug}): count=${ords.length}, min=${Math.min(...nums)}, max=${Math.max(
          ...nums
        )}, sample=${ords
          .slice(0, 3)
          .map((o) => o.numero)
          .join(', ')}`
      );
    }
  }
}

run().catch(console.error);
