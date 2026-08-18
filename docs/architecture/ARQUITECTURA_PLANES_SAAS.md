# Arquitectura del Sistema de Planes y Suscripciones SaaS Multi-Tenant

Este documento describe de manera detallada la arquitectura completa de gestión de **Planes, Suscripciones y Permisos por Módulos** implementada en el sistema. Puedes utilizar exactamente este mismo diseño y flujo de datos para tu nuevo **SaaS de Talleres Mecánicos y de Mantenimiento**.

---

## 📐 1. Modelo de Datos y Estructuras Fundamentales

El sistema se apoya en dos niveles de configuración:
1. **Definición Global de Planes (`Plan`)**: Almacenados en la tabla `planes` de Supabase.
2. **Asignación y Personalización por Tenant (`Tenant`)**: Almacenados en la tabla `tenants` de Supabase.

### A. Tipo de Dato `Plan` (`src/lib/storage.ts`)
```typescript
export type PlanId = "basico" | "pro" | "enterprise"; // Extensible

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null; // null = ilimitado
  limite_whatsapp_mes: number;
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
    multisucursal: boolean;
    logistica: boolean;     // En talleres: Envíos/Servicio a domicilio
    procesos: boolean;      // En talleres: Tablero Kanban de vehículos
  };
  destacado?: boolean;
  polar_product_monthly_url?: string; // Checkout Polar.sh mensual
  polar_product_yearly_url?: string;  // Checkout Polar.sh anual
  precio_sucursal_adicional?: number;
  polar_sucursal_url?: string;
  limite_sucursales_adicionales?: number;
}
```

### B. Tipo de Dato `Tenant` y `TenantConfig` (`src/lib/storage.ts`)
```typescript
export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  plan_id: PlanId;                        // FK hacia el plan actual
  estado: "TRIAL" | "ACTIVO" | "SUSPENDIDO" | "CANCELADO";
  trial_hasta: string;                     // Fecha ISO de vencimiento
  max_sucursales?: number;                 // Cupo de sucursales permitido
  config?: TenantConfig;
  // ...otros datos del tenant (RNC, teléfono, etc.)
}

export interface TenantConfig {
  // ...otras configuraciones operativas
  modulos_override?: {                     // 🔑 Superpoder de personalización individual
    whatsapp?: boolean;
    facturacion_fiscal?: boolean;
    multisucursal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
  };
}
```

---

## 🛠️ 2. Flujo 1: Creación y Edición de Planes en `/admin`

### ¿Cómo funciona?
En el panel del Super Admin (`src/routes/admin.tsx`), la pestaña **"Planes SaaS"** permite crear o modificar los planes que se ofrecen comercialmente.

### Flujo paso a paso:
1. **Interfaz**: El Super Admin abre el modal `PlanDialog`.
2. **Formulario**: Configura:
   - **Información Básica**: Nombre, ID único (`basico`, `pro`, `enterprise`), Precios (`precio_mensual`, `precio_anual`).
   - **Límites**: Límite de mecánicos/empleados, Límite de órdenes/mes, Límite de mensajes de WhatsApp.
   - **Módulos Incluidos**: Switches para activar/desactivar cada uno de los 5 módulos base del plan.
   - **Pasarelas de Pago**: URLs de Checkout en Polar (mensual y anual).
   - **Pay-per-Branch**: Precio por sucursal o taller adicional y límite de extras.
3. **Persistencia defensiva (`savePlan` en `src/lib/storage.ts`)**:
   - Se ejecuta un `.upsert()` en la tabla `planes` de Supabase.
   - Si la base de datos no responde o faltan columnas por migrar, captura la excepción y realiza un fallback guardando los campos esenciales.
   - Actualiza de inmediato la caché en `localStorage` (`KEY.plans`) para garantizar disponibilidad offline/instantánea.

---

## 🏢 3. Flujo 2: Edición de Negocio (Tenant) y Asignación de Plan en `/admin`

### ¿Cómo funciona?
En `/admin`, en la pestaña **"Lavanderías"** (en tu caso **"Talleres Mecánicos"**), el Super Admin puede editar cualquier negocio individualmente mediante el modal de credenciales y suscripción.

### Operaciones al guardar (`handleUpdateAdmin`):
1. **Asignación del Plan Base**:
   - Actualiza `plan_id` de la lavandería/taller llamando a `updateTenantPlan(tenantId, planId)`.
   - Establece la fecha de inicio del plan (`plan_fecha_inicio = new Date().toISOString()`).
2. **Ajuste de Estado y Días de Vigencia/Prueba**:
   - Actualiza `estado` (`ACTIVO`, `TRIAL`, `SUSPENDIDO`, `CANCELADO`) vía `updateTenantStatus`.
   - Calcula y actualiza la fecha exacta de expiración (`trial_hasta`) vía `updateTenantTrialHasta`.
3. **Cupo de Sucursales / Talleres**:
   - Actualiza `max_sucursales` vía `updateTenantMaxSucursales`.
4. **🔑 Anulación de Módulos (Module Overrides)**:
   - El Super Admin puede activar o desactivar un módulo **específicamente para este taller**, sin cambiar su plan.
   - Ejemplo: Un taller con el plan `Básico` necesita usar el módulo de **Facturación Fiscal e-CF**. El Super Admin enciende el switch de Facturación en la edición del taller y llama a `updateTenantModulosOverride(tenantId, overrides)`.
   - Esto guarda el JSON en `tenants.config.modulos_override`.

### 🛡️ Lógica de Resolución de Permisos (`isModuleEnabled`):
Cuando el sistema en cualquier pantalla pregunta si una función está disponible, llama a:
```typescript
export function isModuleEnabled(
  tenant: Tenant | null,
  moduleKey: "whatsapp" | "facturacion_fiscal" | "multisucursal" | "logistica" | "procesos",
  plan?: Plan
): boolean {
  if (!tenant) return false;

  // 1. PRIMERO verifica si el Super Admin forzó un Override para este negocio
  const override = tenant.config?.modulos_override?.[moduleKey];
  if (override !== undefined) {
    return override; // Retorna true/false directo del negocio
  }

  // 2. SEGUNDO (Fallback): Si no hay override, usa la regla por defecto de su plan
  const activePlan = plan || getTenantPlan(tenant);
  return !!activePlan?.modulos?.[moduleKey];
}
```

---

## 🔄 4. Flujo 3: Sincronización en la Pestaña "Plan" en `/configuracion`

### ¿Cómo funciona?
Cuando el dueño o gerente del taller entra a `t/$slug/configuracion` y hace clic en la pestaña **"Plan"**:

1. **Lectura Reactiva de Planes (`usePlans`)**:
   - El hook `usePlans()` ejecuta `getPlans()`, consultando Supabase `planes`.
   - Si no hay conexión o falla la consulta, recurre a `localStorage` o a la constante por defecto `PLANS`.
2. **Banner de Estado de Suscripción**:
   - Muestra el plan actual (`tenant.plan_id`).
   - Muestra el estado actual (`ACTIVO`, `TRIAL`, o `EXPIRED`).
   - Muestra la fecha exacta de renovación o expiración (`tenant.trial_hasta`).
3. **Comparador de Planes (Mensual / Anual)**:
   - Permite alternar la vista entre precio mensual y pago anual (calculando automáticamente el descuento / meses gratis).
   - Renderiza dinámicamente las tarjetas de cada plan con sus límites y los módulos incluidos.
4. **Proceso de Checkout / Upgrade (`SubscriptionModal`)**:
   - Al presionar **"Contratar plan"** o **"Cambiar plan"**, se abre el modal de suscripción.
   - **Opción A (Pasarela Automática - Polar.sh)**: Redirige al link oficial configurado en el plan (`polar_product_monthly_url` o `polar_product_yearly_url`). Al completar el pago, Polar redirige de regreso a `/configuracion?polar_success=true`, mostrando el `SuccessModal`.
   - **Opción B (Transferencia Bancaria Manual)**: Lee los datos bancarios globales (`GlobalConfig.bankDetails`). Ofrece un botón de WhatsApp pre-configurado para enviar el comprobante de pago al Super Admin con un solo clic.

---

## 🌐 5. Flujo 4: Sincronización en la Landing Page (`index.tsx`)

### ¿Cómo funciona?
Para que la Landing Page de ventas (página principal `https://tu-saas.com/`) siempre refleje los precios y características actualizadas sin modificar código:

1. **Carga en Servidor/SSR via Loader (`Route.useLoaderData`)**:
   ```typescript
   export const Route = createFileRoute("/")({
     loader: async () => {
       try {
         const plans = await getPlans();
         return { plans: plans && plans.length > 0 ? plans : STATIC_PLANS };
       } catch (e) {
         return { plans: STATIC_PLANS };
       }
     },
     component: LandingPage,
   });
   ```
2. **Resiliencia con Planes Estáticos (Fallback)**:
   - Si la base de datos Supabase está en mantenimiento o hay latencia, el loader cae suavemente en `STATIC_PLANS`. La página **NUNCA** falla ni se queda en blanco.
3. **Sección `#planes` Dinámica**:
   - Muestra las tarjetas de los precios directo de la base de datos.
   - Al hacer clic en "Comenzar 14 días gratis", redirige a:
     `/registro?plan={plan.id}`
   - El formulario de registro lee `?plan=pro` y asigna automáticamente ese plan al registrar el nuevo taller.

---

## 🔧 6. Guía de Adaptación para SaaS de Talleres Mecánicos y Mantenimiento

Para aplicar exactamente esta misma arquitectura a tu SaaS de Talleres, realiza la siguiente traducción de conceptos:

### A. Equivalencia de Conceptos
| Concepto Lavandería (Klynn) | Concepto Taller Mecánico |
| :--- | :--- |
| **Tenant / Lavandería** | **Tenant / Taller Mecánico** |
| **Órdenes de Lavado** | **Órdenes de Trabajo (OT) / Mantenimientos** |
| **Prendas y Servicios** | **Servicios, Repuestos y Mano de Obra** |
| **Entregas / Repartidores** | **Servicio de Grúa / Recepción y Entrega a Domicilio** |
| **Etapas de Lavado (Procesos)** | **Tablero de Estado de Vehículos (Recepción, Diagnóstico, En Reparación, Listo, Entregado)** |

### B. Definición de Módulos Re-mapeados para Talleres
```typescript
export interface PlanModulosTalleres {
  whatsapp: boolean;             // Recordatorios de mantenimiento, aprobación de presupuestos por WhatsApp
  facturacion_fiscal: boolean;   // Emitir comprobantes fiscales (e-CF / NCF)
  multisucursal: boolean;        // Múltiples talleres/talleres móviles bajo el mismo dueño
  logistica: boolean;            // Asistencia en carretera / Vehículo de reemplazo / Servicio a domicilio
  procesos: boolean;             // Tablero Kanban de producción de mecánicos y rampas de trabajo
}
```

### C. Esquema SQL para Supabase (Tabla `planes` y `tenants`)
```sql
-- 1. Tabla de Planes
CREATE TABLE IF NOT EXISTS public.planes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_mensual NUMERIC NOT NULL,
  precio_anual NUMERIC,
  limite_empleados INTEGER NOT NULL DEFAULT 5,
  limite_ordenes_mes INTEGER, -- NULL = Ilimitado
  limite_whatsapp_mes INTEGER DEFAULT 500,
  whatsapp BOOLEAN DEFAULT TRUE,
  facturacion_fiscal BOOLEAN DEFAULT FALSE,
  multisucursal BOOLEAN DEFAULT FALSE,
  logistica BOOLEAN DEFAULT FALSE,
  procesos BOOLEAN DEFAULT TRUE,
  destacado BOOLEAN DEFAULT FALSE,
  polar_product_monthly_url TEXT,
  polar_product_yearly_url TEXT,
  precio_sucursal_adicional NUMERIC DEFAULT 0,
  limite_sucursales_adicionales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modificación/Creación en la Tabla Tenants (Talleres)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.planes(id) DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS trial_hasta TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS max_sucursales INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
```

---

## 🎯 Resumen de Beneficios de esta Arquitectura

1. **Flexibilidad Total sin Tocar Código**: Creas un plan en `/admin` y aparece inmediatamente en la Landing Page y en el panel del taller.
2. **Personalización VIP por Cliente**: Puedes otorgar el módulo de Facturación Fiscal o WhatsApp a un taller específico mediante `modulos_override`, sin obligarlo a pagar un plan superior.
3. **Resiliencia Multi-Capa**: Funciona con Supabase en la nube, guarda caché en `localStorage` y cuenta con un fallback de datos estáticos en código.
4. **Escalabilidad Multi-Sucursal (Pay-per-Branch)**: Modelo SaaS preparado para cobrar tarifas base + add-ons por talleres adicionales.
