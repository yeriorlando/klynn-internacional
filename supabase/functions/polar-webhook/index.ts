import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateEvent } from "https://esm.sh/@polar-sh/sdk/webhooks";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// MAPEO DE PRODUCTOS DE POLAR
// ============================================================
// Actualiza estos IDs con los que aparecen en tu Dashboard de Polar
// bajo Products -> copiar el "Product ID" de cada uno
const PLAN_MAPPING: Record<string, string> = {
  "prod_basico_id":    "basico",
  "prod_pro_id":       "pro",
  "prod_enterprise_id":"enterprise",
};

// IDs de los productos de "Sucursal Extra" en Polar (uno por plan)
// Cuando alguien paga cualquiera de estos productos, se le suma +1 sucursal
const SUCURSAL_PRODUCT_IDS: string[] = [
  "prod_sucursal_basico_id",
  "prod_sucursal_pro_id",
  "prod_sucursal_enterprise_id",
];

// ============================================================

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.text();

    // ── Validar firma de Polar (seguridad) ──────────────────
    let event: any;
    try {
      event = validateEvent(
        payload,
        Object.fromEntries(req.headers),
        POLAR_WEBHOOK_SECRET,
      );
    } catch (_) {
      console.error("Firma inválida de Polar — petición rechazada");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("Evento recibido de Polar:", event.type);

    // ── Solo procesar pagos completados ─────────────────────
    if (event.type !== "order.created" && event.type !== "subscription.created") {
      return new Response("Event not handled", { status: 200 });
    }

    const data       = event.data;
    const customerEmail = data.customer?.email || data.user?.email;
    const productId     = data.product_id || data.product?.id || "";

    if (!customerEmail) {
      return new Response("No customer email found", { status: 400 });
    }

    console.log(`Procesando pago — Email: ${customerEmail} | Producto: ${productId}`);

    // ══════════════════════════════════════════════════════════
    // CASO 1: Pago de SUCURSAL ADICIONAL
    // ══════════════════════════════════════════════════════════
    const esSucursalExtra = SUCURSAL_PRODUCT_IDS.includes(productId) ||
      await checkIsSucursalProduct(productId);

    if (esSucursalExtra) {
      // Buscar tenant por email y sumarle +1 a max_sucursales
      const { data: tenant, error: fetchError } = await supabase
        .from("tenants")
        .select("id, max_sucursales")
        .eq("email", customerEmail)
        .single();

      if (fetchError || !tenant) {
        console.error("Tenant no encontrado para sucursal extra:", customerEmail);
        return new Response("Tenant not found", { status: 404 });
      }

      const nuevoLimite = (tenant.max_sucursales || 1) + 1;

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ max_sucursales: nuevoLimite })
        .eq("id", tenant.id);

      if (updateError) {
        console.error("Error actualizando max_sucursales:", updateError);
        return new Response("Error updating branch limit", { status: 500 });
      }

      console.log(`✅ Sucursal desbloqueada para ${customerEmail} — Nuevo límite: ${nuevoLimite}`);
      return new Response(JSON.stringify({ ok: true, action: "branch_unlocked", max_sucursales: nuevoLimite }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════════════════
    // CASO 2: Pago de PLAN DE SUSCRIPCION
    // ══════════════════════════════════════════════════════════
    let planId = PLAN_MAPPING[productId];

    if (!planId) {
      // Buscar por URL del producto almacenada en la tabla planes
      const { data: planData } = await supabase
        .from("planes")
        .select("id")
        .or(`polar_product_monthly_url.ilike.%${productId}%,polar_product_yearly_url.ilike.%${productId}%`)
        .single();

      if (planData) planId = planData.id;
    }

    if (!planId) {
      console.error("Producto no mapeado a ningún plan:", productId);
      return new Response("Plan not found", { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        plan_id: planId,
        estado: "ACTIVO",
        plan_fecha_inicio: new Date().toISOString(),
      })
      .eq("email", customerEmail);

    if (updateError) {
      console.error("Error actualizando plan del tenant:", updateError);
      return new Response("Error updating tenant plan", { status: 500 });
    }

    console.log(`✅ Plan ${planId} activado para ${customerEmail}`);
    return new Response(JSON.stringify({ ok: true, action: "plan_activated", plan: planId }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Webhook Error general:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// ── Helper: verifica si el producto es de sucursal extra según tabla planes ──
async function checkIsSucursalProduct(productId: string): Promise<boolean> {
  if (!productId) return false;
  const { data } = await supabase
    .from("planes")
    .select("id")
    .ilike("polar_sucursal_url", `%${productId}%`)
    .maybeSingle();
  return !!data;
}
