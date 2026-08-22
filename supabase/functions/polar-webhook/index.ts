import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateEvent } from "https://esm.sh/@polar-sh/sdk/webhooks";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// MAPEO ESTÁTICO DE PRODUCTOS DE POLAR (FALLBACK)
// ============================================================
const PLAN_MAPPING: Record<string, string> = {
  "prod_basico_id": "basico",
  "prod_pro_id": "pro",
  "prod_enterprise_id": "enterprise",
  "prod_inicial_id": "inicial",
};

// IDs de productos de "Sucursal Extra" en Polar
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
    const headers = Object.fromEntries(req.headers);

    // ── 1. Validar firma de Polar (Seguridad Criptográfica) ──
    let event: any;
    try {
      event = validateEvent(
        payload,
        headers,
        POLAR_WEBHOOK_SECRET,
      );
    } catch (sdkErr: any) {
      // Fallback a StandardWebhooks por si el schema de la versión del SDK difiere
      try {
        const wh = new Webhook(POLAR_WEBHOOK_SECRET);
        event = wh.verify(payload, headers);
      } catch (standardErr: any) {
        console.error("Firma criptográfica inválida de Polar — petición rechazada:", standardErr?.message || standardErr);
        return new Response("Unauthorized", { status: 401 });
      }
    }

    console.log("Evento recibido de Polar:", event.type);

    // ── 2. Filtrar eventos relevantes ───────────────────────
    if (
      event.type !== "order.created" &&
      event.type !== "subscription.created" &&
      event.type !== "subscription.updated"
    ) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = event.data;
    const metadata = data.metadata || data.checkout_metadata || data.custom_field_data || {};
    const tenantId = metadata.tenant_id;
    const metaPlanId = metadata.plan_id;
    const billingPeriod = metadata.period || metadata.billing_period || (event.data?.recurring_interval === "year" ? "yearly" : "monthly");
    const customerEmail = data.customer?.email || data.user?.email || data.customer_email || "";
    const productId = data.product_id || data.product?.id || "";

    console.log(`Procesando pago — Tenant ID: ${tenantId || 'N/A'} | Email: ${customerEmail} | Producto: ${productId} | Plan Meta: ${metaPlanId || 'N/A'}`);

    if (!tenantId && !customerEmail) {
      return new Response("Missing tenant identifier (tenant_id or customer email)", { status: 400 });
    }

    // ── 3. Localizar el Tenant ───────────────────────────────
    let tenant: any = null;
    if (tenantId) {
      const { data: tById } = await supabase
        .from("tenants")
        .select("id, email, plan_id, estado, max_sucursales")
        .eq("id", tenantId)
        .maybeSingle();
      tenant = tById;
    }

    if (!tenant && customerEmail) {
      const { data: tByEmail } = await supabase
        .from("tenants")
        .select("id, email, plan_id, estado, max_sucursales")
        .eq("email", customerEmail)
        .maybeSingle();
      tenant = tByEmail;
    }

    if (!tenant) {
      console.error("Tenant no encontrado en BD para:", { tenantId, customerEmail });
      return new Response("Tenant not found", { status: 404 });
    }

    // ══════════════════════════════════════════════════════════
    // CASO 1: Pago de SUCURSAL ADICIONAL
    // ══════════════════════════════════════════════════════════
    const esSucursalExtra = SUCURSAL_PRODUCT_IDS.includes(productId) ||
      await checkIsSucursalProduct(productId);

    if (esSucursalExtra) {
      const nuevoLimite = (tenant.max_sucursales || 1) + 1;
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ max_sucursales: nuevoLimite })
        .eq("id", tenant.id);

      if (updateError) {
        console.error("Error actualizando max_sucursales:", updateError);
        return new Response("Error updating branch limit", { status: 500 });
      }

      console.log(`✅ Sucursal desbloqueada para tenant ${tenant.id} — Nuevo límite: ${nuevoLimite}`);
      return new Response(JSON.stringify({ ok: true, action: "branch_unlocked", tenant_id: tenant.id, max_sucursales: nuevoLimite }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════════════════
    // CASO 2: Pago de PLAN DE SUSCRIPCION
    // ══════════════════════════════════════════════════════════
    let planId: string | null = metaPlanId || null;

    if (!planId) {
      planId = PLAN_MAPPING[productId] || null;
    }

    if (!planId) {
      // Buscar por URL del producto almacenada en la tabla planes
      const { data: planData } = await supabase
        .from("planes")
        .select("id")
        .or(`polar_product_monthly_url.ilike.%${productId}%,polar_product_yearly_url.ilike.%${productId}%`)
        .maybeSingle();

      if (planData) planId = planData.id;
    }

    if (!planId) {
      console.error("Producto no mapeado a ningún plan:", productId);
      return new Response("Plan not found", { status: 404 });
    }

    // Calcular fecha de vigencia
    const expiryDate = new Date();
    if (billingPeriod === "yearly") {
      expiryDate.setDate(expiryDate.getDate() + 365); // 1 año (con meses gratis)
    } else {
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 días
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        plan_id: planId,
        estado: "ACTIVO",
        plan_fecha_inicio: new Date().toISOString(),
        trial_hasta: expiryDate.toISOString(),
        plan_periodo: billingPeriod,
      })
      .eq("id", tenant.id);

    if (updateError) {
      console.error("Error actualizando plan del tenant:", updateError);
      return new Response("Error updating tenant plan", { status: 500 });
    }

    console.log(`✅ Plan ${planId} (${billingPeriod}) activado con éxito para tenant ${tenant.id} (${tenant.email}) hasta ${expiryDate.toISOString()}`);
    return new Response(JSON.stringify({
      ok: true,
      action: "plan_activated",
      tenant_id: tenant.id,
      plan: planId,
      periodo: billingPeriod,
      trial_hasta: expiryDate.toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Error general:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
