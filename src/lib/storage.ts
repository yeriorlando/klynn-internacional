import { supabase } from "./supabase";
import { createClient } from "@supabase/supabase-js";
import { offlineDB } from "./offline-db";
import { syncManager } from "./sync-manager";
import { computeNextOrderSequence, extractOrderSequenceNumber } from "./order-sequence";
import {
  createOfflineAuthVerifier,
  isOfflineAuthExpired,
  isOfflineAuthLocked,
  recordOfflineAuthFailure,
  recordOfflineAuthSuccess,
  verifyOfflinePassword,
  type OfflineAuthVerifier,
} from "./offline-auth";
import {
  getEmpleadoByIdServer,
  getEmpleadoByEmailAndTenantServer,
  getTenantBySlugServer,
} from "./server-auth";

export const IS_LOCAL_MODE = import.meta.env.VITE_APP_MODE === "local";

export type PlanId = "basico" | "pro" | "enterprise" | string;

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null;
  limite_whatsapp_mes?: number;
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
    multisucursal: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
    pos_offline?: boolean;
  };
  destacado?: boolean;
  es_especial?: boolean;
  titulo_especial?: string;
  polar_product_monthly_url?: string;
  polar_product_yearly_url?: string;
  precio_sucursal_adicional?: number;
  polar_sucursal_url?: string;
  limite_sucursales_adicionales?: number;
}

export interface BankDetails {
  banco: string;
  titular: string;
  rnc: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  standby_sync_frequency?: "1h" | "2h" | "4h" | "6h" | "12h" | "24h";
  standby_last_sync_at?: string;
  standby_last_sync_duration?: string;
  standby_last_sync_status?: "OK" | "ERROR" | "RUNNING";
  standby_last_sync_metrics?: {
    tenants?: number;
    clientes?: number;
    ordenes?: number;
    functions?: number;
  };
}

export interface GlobalConfig {
  requirePlanOnRegistration: boolean;
  trialDays: number;
  defaultPlanId: PlanId;
  bankDetails?: BankDetails;
  requireEmployeeOtp?: boolean;
  whatsapp_engine?: "klynn_connect" | "wasender";
  klynn_connect_url?: string;
  klynn_connect_apikey?: string;
  fiscal_environment_policy?: "per_tenant" | "TesteCF" | "CerteCF" | "eCF";
  standby_sync_frequency?: "1h" | "2h" | "4h" | "6h" | "12h" | "24h";
  standby_last_sync_at?: string;
  standby_last_sync_duration?: string;
  standby_last_sync_status?: "OK" | "ERROR" | "RUNNING";
  standby_last_sync_metrics?: {
    tenants?: number;
    clientes?: number;
    ordenes?: number;
    functions?: number;
  };
}

export type RolEmpleado =
  | "ADMIN"
  | "SUPERVISOR"
  | "VENDEDOR"
  | "RECEPCIONISTA"
  | "REPARTIDOR"
  | "OPERARIO";

export interface Empleado {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  pin?: string;
  rol: RolEmpleado;
  activo: boolean;
  permisos?: string[]; // Array de keys: 'dashboard', 'caja', etc.
  max_descuento_porcentaje?: number;
  creado_en: string;
  avatar_url?: string;
}

type OfflineCachedEmpleado = Empleado & { _offline_auth?: OfflineAuthVerifier };

export interface EmployeeInvitation {
  id: string;
  tenant_id: string;
  email: string;
  status: "pending" | "accepted" | "cancelled";
  invited_by: string;
  auth_user_id?: string | null;
  expires_at: string;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  rnc?: string;
  telefono: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  email: string;
  logo_url?: string;
  color_primario: string;
  color_secundario: string;
  plan_id: PlanId;
  estado: "TRIAL" | "ACTIVO" | "SUSPENDIDO" | "CANCELADO";
  trial_hasta: string;
  creado_en: string;
  config?: TenantConfig;
  whatsapp_sent_month?: number;
  whatsapp_last_reset?: string;
  monto_caja_chica?: number;
  monto_actual_caja_chica?: number;
  max_sucursales?: number;
  limite_credito_dias?: number;
  plan_fecha_inicio?: string;
  nombre_sucursal?: string;
}

export function getTenantBranchName(tenant?: Partial<Tenant> | null): string {
  if (!tenant) return "Sucursal principal";
  const name = tenant.nombre_sucursal || tenant.config?.nombre_sucursal;
  if (name && typeof name === "string" && name.trim()) {
    return name.trim();
  }
  return "Sucursal principal";
}

export interface TenantConfig {
  nombre_sucursal?: string;
  modo_facturacion?: "electronica" | "tradicional";
  itbis_incluido: boolean;
  itbis_porcentaje: number;
  formato_ticket: "57mm" | "80mm";
  impresora_tipo?: "usb" | "bluetooth" | "serial";
  impresora_perfil?: "basica" | "estandar" | "completa";
  impresora_serial_baud?: number;
  ticket_mostrar_rnc: boolean;
  mostrar_empleado: boolean;
  pie_pagina_ticket: string;
  ticket_pie?: string;
  ticket_mostrar_empleado?: boolean;
  ticket_mostrar_notas?: boolean;
  ticket_mostrar_ubicacion?: boolean;
  ticket_nota?: string;
  recargo_urgencia: number; // %
  umbral_diferencia_caja: number;
  monto_max_caja_chica: number;
  ncf_secuencia: string; // p.ej. B02 (default activo)
  ncf_proximo: number;
  ncf_tipos?: string[]; // tipos habilitados: B01, B02, B14, B15, B16
  ncf_facturacion_activa?: boolean;
  usar_color_secundario?: boolean;
  bancarios?: string;
  tiempo_entrega_estandar: number; // en horas
  tiempo_entrega_urgente: number; // en horas
  dias_almacenamiento_sin_retirar?: number; // días límite para considerar ropa sin retirar (default: 5)
  whatsapp?: WhatsAppConfig;
  weekly_summary?: WeeklySummaryConfig;

  // Alertas de Secuencias NCF/e-CF
  alerta_ncf_limite?: number;
  alerta_ncf_telefono?: string;
  max_sucursales?: number;
  pos_habilitar_servicios?: boolean;
  pos_habilitar_prendas?: boolean;
  pos_modal_desglose?: boolean;
  pos_modo_defecto?: boolean;
  pos_auto_imprimir?: boolean;
  pos_requerir_nota_confirmacion?: boolean;
  ticket_imprimir_taller_auto?: boolean;
  ticket_taller_solo_con_ubicacion?: boolean;
  ticket_imprimir_copia_caja?: boolean;
  usar_ubicacion_ropa?: boolean;
  estanteria_zonas?: EstanteriaZona[];
  meses_pagados_override?: number;
  modulos_override?: {
    whatsapp?: boolean;
    facturacion_fiscal?: boolean;
    multisucursal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
    pos_offline?: boolean;
  };
}

export interface WeeklySummaryConfig {
  enabled: boolean;
  frequency: "weekly" | "monthly";
  channel: "email" | "whatsapp" | "both";
  email: string;
  whatsapp_phone: string;
}

export interface EstanteriaZona {
  id: string;
  nombre: string;
  tipo: "conveyor" | "estante" | "riel" | "cesta" | "otro";
  icono?: string;
  color?: string;
  prefijo?: string;
  slots: string[];
}

export function getDefaultEstanteriaZonas(): EstanteriaZona[] {
  return [];
}
export interface WhatsAppConfig {
  enabled: boolean;
  api_key: string;
  instance: string; // nombre de instancia WapiSender o Klynn Connect
  base_url?: string; // por defecto https://wasenderapi.com o https://wa.klynn.com.do
  provider?: "klynn_connect" | "wasender";
  klynn_connect_status?: "open" | "close" | "connecting" | "disconnected";
  klynn_connect_phone?: string;
  klynn_connect_profile_pic?: string;
  klynn_connect_profile_name?: string;
  notif_orden_creada: boolean;
  notif_orden_lista: boolean;
  notif_orden_entregada: boolean;
  notif_orden_sin_retirar?: boolean;
  dias_recordatorio_sin_retirar?: number;
  plantilla_creada: string;
  plantilla_lista: string;
  plantilla_entregada: string;
  plantilla_sin_retirar?: string;
}

export interface LicenciaLocal {
  id: string;
  codigo: string;
  nombre_lavanderia: string;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
  es_anual: boolean;
  expira_en?: string;
  whatsapp_activo: boolean;
  facturacion_activa: boolean;
  creado_en: string;
  ultima_sincronizacion?: string;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  sector?: string;
  edificio_apto?: string;
  referencia?: string;
  lat?: number;
  lng?: number;
  cedula?: string;
  notas?: string;
  tipo: "Consumidor Final" | "Empresa";
  limite_credito: number;
  creado_en: string;
}

export type EstadoOrden =
  | "RECIBIDA"
  | "EN_PROCESO"
  | "LISTA"
  | "EN_CAMINO"
  | "ENTREGADA"
  | "PAGADA"
  | "ANULADA"
  | "INCIDENCIA";
export type MetodoPago =
  | "EFECTIVO"
  | "TARJETA"
  | "TRANSFERENCIA"
  | "CREDITO"
  | "MIXTO"
  | "PAGO_AL_RETIRAR";

export interface PagoDesgloseItem {
  metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
  monto: number;
  recibido?: number;
  referencia?: string;
}

export interface OrdenItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  es_libra?: boolean;
  is_exento?: boolean;
  color?: string;
  color_hex?: string;
  notas?: string;
  servicio_origen?: string;
}

export interface Orden {
  id: string;
  tenant_id: string;
  numero: string;
  cliente_id: string;
  empleado_id: string;
  servicios: string[];
  servicios_precios?: Record<string, number>;
  items: OrdenItem[];
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  metodo_pago: MetodoPago;
  condicion_cobro?: "COBRAR_AHORA" | "ANTICIPO" | "AL_RETIRAR" | "CREDITO";
  pagos_detalle?: PagoDesgloseItem[];
  anticipo_monto?: number;
  dias_credito?: number;
  fecha_vencimiento_credito?: string;
  estado: EstadoOrden;
  fecha_entrega: string;
  es_urgente: boolean;
  ubicacion_ropa?: string;
  notas?: string;
  creado_en: string;
  ncf?: string;
  tipo_ecf?: string; // Nuevo: E31, E32, etc.
  ecf_id?: string; // Nuevo: ID del documento en ecf_documents
  motivo_anulacion?: string;
  motivo_anulacion_codigo?: string; // Código DGII: 01, 02, 03, 04, 05
  nota_credito_ncf?: string; // NCF de la nota de crédito (E34)
  nota_credito_id?: string; // ID del documento ECF E34
  nota_credito_monto?: number; // Monto descontado/devuelto
  nota_debito_ncf?: string; // NCF de la nota de débito (E33)
  nota_debito_id?: string; // ID del documento ECF E33
  nota_debito_monto?: number; // Monto adicionado
  ultimo_recordatorio_en?: string; // Fecha ISO del último recordatorio por WhatsApp enviada para prendas almacenadas
  entrega_domicilio?: boolean;
  costo_envio?: number;
  repartidor_id?: string;
  direccion_entrega?: string;
  sector_entrega?: string;
  referencia_entrega?: string;
  lat_entrega?: number;
  lng_entrega?: number;
  pod_foto?: string;
  pod_firma?: string;
  pod_receptor?: string;
  pod_fecha?: string;
  pod_cobro_monto?: number;
  pod_cobro_metodo?: MetodoPago;
  incidencia_motivo?: string;
  incidencia_notas?: string;
  incidencia_fecha?: string;
  // Metadatos e-CF para el ticket y sincronización offline
  ecf_status?: "PENDING_OFFLINE_TRANSMISSION" | "SIGNED" | "ERROR" | string;
  ecf_qr?: string;
  ecf_security_code?: string;
  ecf_signature_date?: string;
  ncf_vencimiento?: string;
  pago_referencia?: string;
}

// ============ ECF Types ============

export interface ECFConfig {
  id: string;
  tenant_id: string;
  rnc_emisor: string;
  razon_social: string;
  nombre_comercial?: string;
  certificate_data?: string;
  certificate_password?: string;
  certificate_expiry?: string;
  certificate_uploaded_at?: string;
  ambiente: "pruebas" | "produccion";
  pronesoft_environment?: "TesteCF" | "CerteCF" | "eCF";
  is_active: boolean;
  api_auth_token?: string;
  api_token_expires_at?: string;
  // Pronesoft multi-empresa
  pronesoft_tenant_id?: string; // x-tenant-id (UUID asignado por Pronesoft a este negocio)
  usar_credenciales_propias?: boolean;
  pronesoft_client_id?: string;
  pronesoft_client_secret?: string;
  updated_at: string;
  created_at?: string;
}

export interface ECFDocumentRecibido {
  id: string;
  tenant_id: string;
  pronesoft_id: string;
  encf: string;
  rnc_emisor: string;
  nombre_emisor?: string;
  tipo_ecf: string;
  fecha_emision: string;
  monto_total: number;
  monto_itbis: number;
  estado_comercial: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  pdf_url?: string;
  creado_en: string;
}

export interface ECFSequence {
  id: string;
  pronesoft_sequence_id?: string;
  tenant_id: string;
  tipo_ecf: string;
  prefijo: string;
  valor_inicial: number;
  valor_final: number;
  valor_actual: number;
  expiration_date?: string;
  is_active: boolean;
  recibir_alertas?: boolean;
  alerta_limite?: number;
}

export interface ECFDocument {
  id: string;
  tenant_id: string;
  order_id?: string;
  encf: string;
  tipo_ecf: string;
  rnc_receptor?: string;
  track_id?: string;
  status: "pending" | "accepted" | "rejected" | "accepted_with_reservations";
  dgii_response?: any;
  xml_content: string;
  signature_value?: string;
  signature_date?: string;
  qr_content?: string;
  monto_total: number;
  monto_itbis: number;
  fecha_emision: string;
  pdf_url?: string;
  xml_url?: string;
  document_stamp_url?: string;
  security_code?: string;
  contingency_mode?: boolean;
  legal_status?: string;
  pronesoft_id?: string;
}

export type EstadoCaja = "ABIERTA" | "CERRADA";
export type TipoMovimiento =
  | "VENTA"
  | "ABONO"
  | "INGRESO"
  | "EGRESO"
  | "RETIRO"
  | "GASTO_CAJA_CHICA";

export interface Caja {
  id: string;
  tenant_id: string;
  empleado_id: string;
  monto_inicial: number;
  estado: EstadoCaja;
  abierta_en: string;
  cerrada_en?: string;
  monto_esperado_efectivo?: number;
  monto_contado_efectivo?: number;
  monto_contado_tarjeta?: number;
  monto_contado_transferencia?: number;
  diferencia?: number;
  notas_cierre?: string;
  notas_apertura?: string;
}

export interface MovimientoCaja {
  id: string;
  tenant_id: string;
  caja_id: string;
  empleado_id: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  metodo?: MetodoPago;
  referencia?: string;
  orden_id?: string;
  creado_en: string;
}

export interface Gasto {
  id: string;
  tenant_id: string;
  empleado_id: string;
  categoria: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  proveedor?: string;
  comprobante_url?: string;
  fecha: string;
  aprobado: boolean;
  is_caja_chica?: boolean;
}

export interface CatalogoItem {
  id: string;
  tenant_id: string;
  categoria: string;
  nombre: string;
  precio: number;
  por_libra?: boolean;
  activo: boolean;
  is_exento?: boolean;
  imagen_url?: string;
  icono?: string;
  es_muestra?: boolean;
  permitir_desglose?: boolean;
  permitir_editar_precio?: boolean;
}

export interface Servicio {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  imagen_url?: string;
  activo: boolean;
  precio: number;
  por_libra?: boolean;
  is_exento?: boolean;
  es_muestra?: boolean;
  permitir_desglose?: boolean;
  permitir_editar_precio?: boolean;
}

export interface InvitacionCodigo {
  id: string;
  codigo: string; // ej: "KL-7283"
  nota?: string;
  plan_id?: PlanId;
  dias_trial?: number;
  estado: "DISPONIBLE" | "USADO" | "EXPIRADO";
  creado_en: string;
  expira_en?: string | null;
  usado_en?: string | null;
  usado_por_slug?: string | null;
  usado_por_email?: string | null;
}

export const KEY = {
  tenants: "lvx:tenants",
  empleados: "lvx:empleados",
  plans: "lvx:plans",
  clientes: "lvx:clientes",
  ordenes: "lvx:ordenes",
  cajas: "lvx:cajas",
  movimientos: "lvx:movimientos",
  gastos: "lvx:gastos",
  catalogo: "lvx:catalogo",
  servicios: "lvx:servicios",
  active: "lvx:activeTenant",
  session: "lvx:session",
  seq: "lvx:orden_seq",
  globalConfig: "lvx:globalConfig",
  invitaciones: "lvx:invitaciones",
};

export const ADMIN_EMAILS = ["admin@klynn.com.do"];

export const PLANS: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio_mensual: 1300,
    precio_anual: 12000,
    limite_empleados: 2,
    limite_ordenes_mes: 300,
    limite_whatsapp_mes: 300,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: false,
      multisucursal: true,
      logistica: false,
      procesos: true,
      estanteria: true,
      pos_offline: false,
    },
    precio_sucursal_adicional: 1000,
    limite_sucursales_adicionales: 1,
    polar_sucursal_url: "",
  },
  {
    id: "pro",
    nombre: "Pro",
    precio_mensual: 2800,
    precio_anual: 28500,
    limite_empleados: 10,
    limite_ordenes_mes: 1000,
    limite_whatsapp_mes: 1000,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: false,
      multisucursal: true,
      logistica: true,
      procesos: true,
      estanteria: true,
      pos_offline: true,
    },
    destacado: true,
    precio_sucursal_adicional: 1200,
    limite_sucursales_adicionales: 3,
    polar_sucursal_url: "",
  },
  {
    id: "enterprise",
    nombre: "Enterprise",
    precio_mensual: 10000,
    precio_anual: 110000,
    limite_empleados: 999,
    limite_ordenes_mes: null,
    limite_whatsapp_mes: 5000,
    modulos: {
      whatsapp: true,
      facturacion_fiscal: true,
      multisucursal: true,
      logistica: true,
      procesos: true,
      estanteria: true,
      pos_offline: true,
    },
    precio_sucursal_adicional: 1500,
    limite_sucursales_adicionales: 5,
    polar_sucursal_url: "",
  },
];

let _cachedPlans: Plan[] = PLANS;

export function getTenantPlan(tenant: Tenant | null, dynamicPlans?: Plan[]): Plan {
  const list = dynamicPlans || _cachedPlans || PLANS;
  if (!tenant) return list[0] || PLANS[0];
  return list.find((p) => p.id === tenant.plan_id) || list[0] || PLANS[0];
}

export function resolveTenantId(idOrSlug?: string): string {
  if (!idOrSlug || idOrSlug === "undefined" || idOrSlug === "__loading__") {
    return "";
  }
  if (idOrSlug.length === 36 && !idOrSlug.startsWith("ten-")) {
    return idOrSlug;
  }
  return idOrSlug;
}

export function isSameTenant(tid1?: string, tid2?: string): boolean {
  if (!tid1 || !tid2) return false;
  if (tid1 === tid2) return true;
  const clean1 = tid1.replace("ten-", "").replace("tenant-", "").toLowerCase();
  const clean2 = tid2.replace("ten-", "").replace("tenant-", "").toLowerCase();
  return clean1 === clean2;
}

export function isModuleEnabled(
  tenant: Tenant | null,
  moduleKey:
    | "whatsapp"
    | "facturacion_fiscal"
    | "multisucursal"
    | "logistica"
    | "procesos"
    | "estanteria"
    | "pos_offline",
  plan?: Plan,
): boolean {
  if (!tenant || tenant.id === "__loading__") return true;

  // 1. Check if there is an explicit override in tenant.config.modulos_override
  const override = tenant.config?.modulos_override?.[moduleKey];
  if (override !== undefined && override !== null) {
    return !!override;
  }

  // 2. Fallback to plan
  const activePlan = plan || getTenantPlan(tenant);
  if (moduleKey === "estanteria") {
    return activePlan?.modulos?.estanteria !== undefined ? !!activePlan.modulos.estanteria : true;
  }
  if (moduleKey === "procesos") {
    return activePlan?.modulos?.procesos !== undefined ? !!activePlan.modulos.procesos : true;
  }
  if (moduleKey === "pos_offline") {
    return activePlan?.modulos?.pos_offline !== undefined
      ? !!activePlan.modulos.pos_offline
      : false;
  }
  return !!activePlan?.modulos?.[moduleKey];
}

export const DEFAULT_CONFIG: TenantConfig = {
  nombre_sucursal: "Sucursal principal",
  itbis_incluido: false,
  itbis_porcentaje: 18,
  formato_ticket: "80mm",
  impresora_tipo: "usb",
  impresora_perfil: "basica",
  impresora_serial_baud: 9600,
  ticket_mostrar_rnc: true,
  mostrar_empleado: true,
  pie_pagina_ticket: "¡Gracias por su preferencia!",
  ticket_pie: "¡Gracias por su preferencia!",
  ticket_mostrar_empleado: true,
  ticket_mostrar_notas: false,
  ticket_mostrar_ubicacion: false,
  ticket_nota: "",
  recargo_urgencia: 30,
  umbral_diferencia_caja: 100,
  monto_max_caja_chica: 2000,
  ncf_secuencia: "B02",
  ncf_proximo: 1,
  ncf_tipos: ["B02"],
  ncf_facturacion_activa: false,
  usar_color_secundario: false,
  tiempo_entrega_estandar: 24,
  tiempo_entrega_urgente: 6,
  alerta_ncf_limite: 50,
  alerta_ncf_telefono: "",
  weekly_summary: {
    enabled: false,
    frequency: "weekly",
    channel: "email",
    email: "",
    whatsapp_phone: "",
  },
  pos_auto_imprimir: false,
  ticket_imprimir_taller_auto: false,
  ticket_taller_solo_con_ubicacion: false,
  ticket_imprimir_copia_caja: false,
  whatsapp: {
    enabled: false,
    api_key: "",
    instance: "",
    base_url: "https://wasenderapi.com",
    notif_orden_creada: true,
    notif_orden_lista: true,
    notif_orden_entregada: false,
    notif_orden_sin_retirar: true,
    dias_recordatorio_sin_retirar: 5,
    plantilla_creada: `✨ *{tipo_documento}* ✨
-----------------------------------
🧺 *{lavanderia}*
🏢 RNC: {rnc}
📞 Tel: {lavanderia_tel}
📍 {lavanderia_dir}
-----------------------------------
📄 *ORDEN:* {numero}
🧾 *NCF:* {ncf}
📅 *Vencimiento:* {ncf_vencimiento}
📅 *Fecha:* {fecha}
-----------------------------------
👤 *CLIENTE:* {cliente}
🪪 *{cliente_tipo_doc}:* {cliente_cedula}
📞 Tel: {cliente_tel}
📍 Dir: {cliente_dir}
-----------------------------------
✨ *SERVICIOS:*
{servicios}
-----------------------------------
👕 *DETALLE:*
{detalle}
-----------------------------------
💰 *SUBTOTAL:* {subtotal}
💸 *ITBIS:* {itbis}
🔥 *TOTAL:* {total}
-----------------------------------
💳 *Pago:* {metodo_pago}
💵 *Recibido:* {pagado}
🔙 *Vuelto:* {vuelto}
🛑 *Saldo Pendiente:* {saldo}
-----------------------------------
🚚 *Entrega:* {entrega}
✅ *Estado:* {estado}

{ticket_pie}
{ticket_nota}`,
    plantilla_lista:
      "Hola 👋, {cliente} ✨, tu orden {numero} de:\n\n{detalle}\n\nEn {lavanderia} ya está LISTA para retirar. ¡Te esperamos!",
    plantilla_entregada:
      "Hola 👋, {cliente}, tu orden {numero} fue entregada. ¡Gracias por preferir {lavanderia}!",
    plantilla_sin_retirar:
      "Hola 👋, {cliente}. Te recordamos que tu orden {numero} de:\n\n{detalle}\n\nLleva {dias} días lista en {lavanderia}. Saldo pendiente: {saldo}.\n¡Pasa a retirarla cuando gustes en {lavanderia_dir}!",
  },
  pos_habilitar_servicios: true,
  pos_habilitar_prendas: true,
  pos_modal_desglose: false,
  pos_modo_defecto: true,
};

export const CATEGORIAS_GASTOS = [
  "Suministros",
  "Servicios (luz, agua, internet)",
  "Mantenimiento",
  "Alquiler",
  "Salarios",
  "Transporte",
  "Marketing",
  "Oficina",
  "Otros",
];

export const TIPOS_SERVICIO = [
  "Lavado y secado",
  "Solo lavado",
  "Solo secado",
  "Planchado",
  "Lavado por libra",
  "Lavado en seco",
  "Sastrería",
  "Tapicería",
  "Alfombras",
  "Edredones",
  "Uniformes",
];

export const PROVINCIAS_RD = [
  "Azua",
  "Baoruco",
  "Barahona",
  "Dajabón",
  "Distrito Nacional",
  "Duarte",
  "Elías Piña",
  "El Seibo",
  "Espaillat",
  "Hato Mayor",
  "Hermanas Mirabal",
  "Independencia",
  "La Altagracia",
  "La Romana",
  "La Vega",
  "María Trinidad Sánchez",
  "Monseñor Nouel",
  "Monte Cristi",
  "Monte Plata",
  "Pedernales",
  "Peravia",
  "Puerto Plata",
  "Samaná",
  "San Cristóbal",
  "San José de Ocoa",
  "San Juan",
  "San Pedro de Macorís",
  "Sánchez Ramírez",
  "Santiago",
  "Santiago Rodríguez",
  "Santo Domingo",
  "Valverde",
];

// Mapa de nombres completos para tipos de comprobantes fiscales
export const NCF_NOMBRES: Record<string, string> = {
  B01: "CRÉDITO FISCAL",
  B02: "CONSUMIDOR FINAL",
  B03: "NOTA DE DÉBITO",
  B04: "NOTA DE CRÉDITO",
  B11: "COMPRAS",
  B13: "GASTOS MENORES",
  B14: "RÉGIMEN ESPECIAL",
  B15: "GUBERNAMENTAL",
  B16: "EXPORTACIONES",
  E31: "CRÉDITO FISCAL",
  E32: "CONSUMIDOR FINAL",
  E33: "NOTA DE DÉBITO",
  E34: "NOTA DE CRÉDITO",
  E41: "COMPRAS",
  E43: "GASTOS MENORES",
  E44: "REGÍMENES ESPECIALES",
  E45: "GUBERNAMENTAL",
  E46: "EXPORTACIONES",
  E47: "PAGOS AL EXTERIOR",
};

export const NCF_TIPOS: { codigo: string; nombre: string; descripcion: string }[] = [
  { codigo: "B01", nombre: "Crédito Fiscal", descripcion: "Para empresas con RNC" },
  { codigo: "B02", nombre: "Consumidor Final", descripcion: "Venta a consumidor final" },
  {
    codigo: "B14",
    nombre: "Régimen Especial",
    descripcion: "Sectores especiales (zonas francas, etc.)",
  },
  { codigo: "B15", nombre: "Gubernamental", descripcion: "Ventas a entidades gubernamentales" },
  { codigo: "B16", nombre: "Exportaciones", descripcion: "Para exportaciones de bienes/servicios" },
];

export const PERMISOS_SISTEMA = [
  { id: "dashboard", nombre: "Dashboard", descripcion: "Vista general y métricas rápidas" },
  { id: "nueva-orden", nombre: "Nueva Orden", descripcion: "Crear y recibir pedidos" },
  { id: "ordenes", nombre: "Órdenes", descripcion: "Ver historial y estados de órdenes" },
  {
    id: "procesos",
    nombre: "Operaciones",
    descripcion: "Control de producción y etapas",
  },
  { id: "caja", nombre: "Caja", descripcion: "Apertura, cierre y movimientos" },
  { id: "clientes", nombre: "Clientes", descripcion: "Gestión de base de datos de clientes" },
  { id: "catalogo", nombre: "Catálogo", descripcion: "Prendas, precios y servicios" },
  { id: "personal", nombre: "Personal", descripcion: "Gestión de empleados y permisos" },
  { id: "logistica", nombre: "Logística", descripcion: "Control de despacho y repartidores" },
  { id: "gastos", nombre: "Gastos", descripcion: "Registro de egresos y compras" },
  { id: "reportes", nombre: "Reportes", descripcion: "Estadísticas y análisis financiero" },
  { id: "configuracion", nombre: "Configuración", descripcion: "Ajustes de la lavandería" },
  {
    id: "nota-credito",
    nombre: "Nota de Crédito",
    descripcion: "Emitir notas de crédito electrónicas",
  },
  {
    id: "nota-debito",
    nombre: "Nota de Débito",
    descripcion: "Emitir notas de débito electrónicas",
  },
  { id: "anular-orden", nombre: "Anular Orden", descripcion: "Anular órdenes registradas" },
  {
    id: "condonar-deuda",
    nombre: "Condonar Deuda",
    descripcion: "Condonar saldos pendientes de pago",
  },
];

export function getPermisosPorRol(rol: RolEmpleado): string[] {
  switch (rol) {
    case "ADMIN":
      return PERMISOS_SISTEMA.map((p) => p.id);
    case "SUPERVISOR":
      return [
        "dashboard",
        "nueva-orden",
        "ordenes",
        "procesos",
        "caja",
        "clientes",
        "catalogo",
        "logistica",
        "gastos",
        "reportes",
      ];
    case "VENDEDOR":
      return ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes"];
    case "RECEPCIONISTA":
      return ["nueva-orden", "clientes", "ordenes", "procesos"];
    case "REPARTIDOR":
      return ["logistica"];
    case "OPERARIO":
      return ["procesos"];
    default:
      return [];
  }
}

const isBrowser = () => typeof window !== "undefined";
export function read<T>(k: string, f: T): T {
  if (!isBrowser()) return f;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : f;
  } catch {
    return f;
  }
}
export function write<T>(k: string, v: T) {
  if (isBrowser()) localStorage.setItem(k, JSON.stringify(v));
}

// ============ Plans ============

export async function getPlans(): Promise<Plan[]> {
  if (typeof window !== "undefined" && !navigator.onLine) {
    const localStored = read<Plan[] | null>(KEY.plans, null);
    if (localStored && localStored.length > 0) return localStored;
    return PLANS;
  }

  try {
    const fetchPromise = supabase.from("planes").select("*").order("precio_mensual");
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (!error && data && data.length > 0) {
      const localStored = read<Plan[] | null>(KEY.plans, null) || [];
      const mapped = data.map((p) => {
        const localMatch = localStored.find((lp) => lp.id === p.id);
        const staticMatch = PLANS.find((sp) => sp.id === p.id);

        return {
          id: p.id as PlanId,
          nombre: p.nombre,
          precio_mensual: p.precio_mensual,
          precio_anual: p.precio_anual,
          limite_empleados: p.limite_empleados,
          limite_ordenes_mes: p.limite_ordenes_mes,
          modulos: {
            whatsapp:
              p.whatsapp !== undefined && p.whatsapp !== null
                ? !!p.whatsapp
                : localMatch?.modulos?.whatsapp !== undefined
                  ? !!localMatch.modulos.whatsapp
                  : !!staticMatch?.modulos?.whatsapp,
            facturacion_fiscal:
              p.facturacion_fiscal !== undefined && p.facturacion_fiscal !== null
                ? !!p.facturacion_fiscal
                : localMatch?.modulos?.facturacion_fiscal !== undefined
                  ? !!localMatch.modulos.facturacion_fiscal
                  : !!staticMatch?.modulos?.facturacion_fiscal,
            multisucursal:
              p.multisucursal !== undefined && p.multisucursal !== null
                ? !!p.multisucursal
                : localMatch?.modulos?.multisucursal !== undefined
                  ? !!localMatch.modulos.multisucursal
                  : !!staticMatch?.modulos?.multisucursal,
            logistica:
              p.logistica !== undefined && p.logistica !== null
                ? !!p.logistica
                : localMatch?.modulos?.logistica !== undefined
                  ? !!localMatch.modulos.logistica
                  : !!staticMatch?.modulos?.logistica,
            procesos:
              p.procesos !== undefined && p.procesos !== null
                ? !!p.procesos
                : localMatch?.modulos?.procesos !== undefined
                  ? !!localMatch.modulos.procesos
                  : (staticMatch?.modulos?.procesos ?? false),
            estanteria:
              p.estanteria !== undefined && p.estanteria !== null
                ? !!p.estanteria
                : localMatch?.modulos?.estanteria !== undefined
                  ? !!localMatch.modulos.estanteria
                  : (staticMatch?.modulos?.estanteria ?? false),
            pos_offline:
              p.pos_offline !== undefined && p.pos_offline !== null
                ? !!p.pos_offline
                : localMatch?.modulos?.pos_offline !== undefined
                  ? !!localMatch.modulos.pos_offline
                  : (staticMatch?.modulos?.pos_offline ?? false),
          },
          limite_whatsapp_mes:
            p.limite_whatsapp_mes ??
            localMatch?.limite_whatsapp_mes ??
            staticMatch?.limite_whatsapp_mes ??
            0,
          destacado:
            localMatch?.destacado !== undefined
              ? !!localMatch.destacado
              : p.destacado !== undefined && p.destacado !== null
                ? !!p.destacado
                : !!staticMatch?.destacado,
          es_especial:
            localMatch?.es_especial !== undefined
              ? !!localMatch.es_especial
              : p.es_especial !== undefined && p.es_especial !== null
                ? !!p.es_especial
                : (staticMatch?.es_especial ?? false),
          titulo_especial:
            localMatch?.titulo_especial !== undefined &&
            localMatch?.titulo_especial !== null &&
            localMatch.titulo_especial !== ""
              ? localMatch.titulo_especial
              : p.titulo_especial || staticMatch?.titulo_especial || "Plan especial",
          polar_product_monthly_url:
            p.polar_product_monthly_url ??
            localMatch?.polar_product_monthly_url ??
            staticMatch?.polar_product_monthly_url,
          polar_product_yearly_url:
            p.polar_product_yearly_url ??
            localMatch?.polar_product_yearly_url ??
            staticMatch?.polar_product_yearly_url,
          precio_sucursal_adicional:
            p.precio_sucursal_adicional !== undefined && p.precio_sucursal_adicional !== null
              ? p.precio_sucursal_adicional
              : (localMatch?.precio_sucursal_adicional ??
                staticMatch?.precio_sucursal_adicional ??
                0),
          polar_sucursal_url:
            p.polar_sucursal_url !== undefined && p.polar_sucursal_url !== null
              ? p.polar_sucursal_url
              : (localMatch?.polar_sucursal_url ?? staticMatch?.polar_sucursal_url ?? ""),
          limite_sucursales_adicionales:
            p.limite_sucursales_adicionales !== undefined &&
            p.limite_sucursales_adicionales !== null
              ? p.limite_sucursales_adicionales
              : (localMatch?.limite_sucursales_adicionales ??
                staticMatch?.limite_sucursales_adicionales ??
                0),
        };
      });
      const extraLocalPlans = localStored.filter((lp) => !data.some((dp: any) => dp.id === lp.id));
      const fullMapped = [...mapped, ...extraLocalPlans];
      _cachedPlans = fullMapped;
      write(KEY.plans, fullMapped);
      return fullMapped;
    }
  } catch (e) {
    console.error("Error fetching plans from Supabase:", e);
  }

  const s = read<Plan[] | null>(KEY.plans, null);
  if (!Array.isArray(s) || s.length === 0) return PLANS;
  _cachedPlans = s;
  return s;
}
export function savePlans(plans: Plan[]) {
  _cachedPlans = plans;
  write(KEY.plans, plans);
}

// ============ Licencias Desktop (Supabase) ============
export async function getLicenciasLocales(): Promise<LicenciaLocal[]> {
  const { data, error } = await supabase
    .from("licencias_locales")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) {
    console.error("Error getLicenciasLocales:", error);
    return [];
  }
  return data || [];
}

export async function createLicenciaLocal(lic: Partial<LicenciaLocal>) {
  const { data, error } = await supabase.from("licencias_locales").insert(lic).select().single();
  if (error) throw error;
  return data;
}

export async function updateLicenciaLocal(id: string, updates: Partial<LicenciaLocal>) {
  const { error } = await supabase.from("licencias_locales").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteLicenciaLocal(id: string) {
  const { error } = await supabase.from("licencias_locales").delete().eq("id", id);
  if (error) throw error;
}

// ============ Tenants (Supabase) ============
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from("tenants").select("*").order("nombre");
  if (error) {
    console.error("Error getTenants:", error);
    return [];
  }
  return data || [];
}

export async function saveTenant(t: Tenant) {
  const realId = resolveTenantId(t.id);
  const branchName = t.nombre_sucursal || t.config?.nombre_sucursal || "Sucursal principal";
  const updatedTenant: Tenant = {
    ...t,
    id: realId,
    nombre_sucursal: branchName,
    config: {
      ...DEFAULT_CONFIG,
      ...t.config,
      nombre_sucursal: branchName,
    },
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(`klynn_tenant_id_${realId}`, JSON.stringify(updatedTenant));
    if (updatedTenant.slug) {
      localStorage.setItem(
        `klynn_tenant_cache_${updatedTenant.slug}`,
        JSON.stringify(updatedTenant),
      );
    }
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: realId,
      tenant_id: realId,
      table_name: "tenants",
      action: "UPSERT",
      payload: updatedTenant,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("tenants").upsert(updatedTenant);
    if (error) {
      if (error.message && error.message.includes("nombre_sucursal")) {
        const { nombre_sucursal: _, ...fallbackTenant } = updatedTenant;
        const { error: errFallback } = await supabase.from("tenants").upsert(fallbackTenant);
        if (errFallback) throw errFallback;
        return;
      }
      throw error;
    }
  } catch (err) {
    await offlineDB.addToOutbox({
      id: realId,
      tenant_id: realId,
      table_name: "tenants",
      action: "UPSERT",
      payload: updatedTenant,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function saveTenantConfig(tenantId: string, config: TenantConfig) {
  const realId = resolveTenantId(tenantId);

  // 1. Actualizar caché local de inmediato para 0ms de respuesta y persistencia offline
  if (typeof window !== "undefined") {
    const cacheKey = `klynn_tenant_id_${realId}`;
    let cachedTenant: Tenant | null = null;
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try {
        cachedTenant = JSON.parse(raw);
      } catch {}
    }
    if (!cachedTenant) {
      const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
      if (lastAuthStr) {
        try {
          const parsed = JSON.parse(lastAuthStr);
          if (parsed?.tenant) cachedTenant = parsed.tenant;
        } catch {}
      }
    }
    if (cachedTenant) {
      cachedTenant.config = { ...(cachedTenant.config || {}), ...config };
      localStorage.setItem(cacheKey, JSON.stringify(cachedTenant));
      if (cachedTenant.slug) {
        localStorage.setItem(
          `klynn_tenant_cache_${cachedTenant.slug}`,
          JSON.stringify(cachedTenant),
        );
      }
      const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
      if (lastAuthStr) {
        try {
          const parsed = JSON.parse(lastAuthStr);
          if (parsed?.tenant) {
            parsed.tenant.config = { ...(parsed.tenant.config || {}), ...config };
            localStorage.setItem("klynn_last_auth_user", JSON.stringify(parsed));
          }
        } catch {}
      }
    }
  }

  // 2. Si estamos sin conexión, agregar a Outbox
  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: realId,
      tenant_id: realId,
      table_name: "tenants",
      action: "UPDATE",
      payload: { config },
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  // 3. Intentar guardar en Supabase
  try {
    const { error } = await supabase.from("tenants").update({ config }).eq("id", realId);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: realId,
      tenant_id: realId,
      table_name: "tenants",
      action: "UPDATE",
      payload: { config },
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function sendSignUpOtp(
  email: string,
  password: string,
  nombre: string,
  tenantId: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        tenant_id: tenantId,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignUpOtp(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  if (error) throw error;
  return data;
}

export async function verifyOtpAndRegisterTenant(
  otpToken: string,
  tenant: Tenant,
  admin: Empleado,
) {
  // 1. Verificar OTP en Supabase Auth
  let verifyResult = await supabase.auth.verifyOtp({
    email: admin.email,
    token: otpToken.trim(),
    type: "signup",
  });

  if (verifyResult.error) {
    // Intentar con type: 'email' si signup falla
    verifyResult = await supabase.auth.verifyOtp({
      email: admin.email,
      token: otpToken.trim(),
      type: "email",
    });
  }

  if (verifyResult.error) throw verifyResult.error;
  const user = verifyResult.data.user;
  if (!user) throw new Error("No se pudo verificar el usuario");

  // 2. Guardar la lavandería
  const branchName = tenant.nombre_sucursal || "Sucursal principal";
  const tenantToSave: Tenant = {
    ...tenant,
    nombre_sucursal: branchName,
    config: {
      ...DEFAULT_CONFIG,
      ...tenant.config,
      nombre_sucursal: branchName,
    },
  };

  let tenantError;
  const { error: err1 } = await supabase.from("tenants").insert(tenantToSave);
  if (err1 && err1.message && err1.message.includes("nombre_sucursal")) {
    const { nombre_sucursal: _, ...fallbackTenant } = tenantToSave;
    const { error: err2 } = await supabase.from("tenants").insert(fallbackTenant);
    tenantError = err2;
  } else {
    tenantError = err1;
  }

  if (tenantError) {
    throw new Error(
      "Error al crear lavandería: " + tenantError.message + ". Por favor contacta soporte.",
    );
  }

  // 3. Guardar el Administrador vinculado al ID de Auth
  const { password: _pw, ...empData } = admin;
  const { error: empError } = await supabase.from("empleados").insert({
    ...empData,
    avatar_url: admin.avatar_url || null,
    id: user.id,
    password: "***",
  });

  if (empError) {
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(
      "Error al crear empleado: " + empError.message + ". Por favor intenta de nuevo.",
    );
  }

  // 4. Iniciar sesión si no hay sesión activa
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      await supabase.auth.signInWithPassword({
        email: admin.email,
        password: admin.password,
      });
    }
  } catch (loginErr) {
    console.warn("Auto-login warning:", loginErr);
  }

  return { tenant: tenantToSave, user };
}

export async function registerTenant(tenant: Tenant, admin: Empleado) {
  // 1. Crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: admin.email,
    password: admin.password,
    options: {
      data: {
        nombre: admin.nombre,
        tenant_id: tenant.id,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("No se pudo crear el usuario");

  // Auto-confirmar el email del tenant admin en Auth
  try {
    await supabase.rpc("admin_set_user_email", {
      target_user_id: authData.user.id,
      new_email: admin.email.toLowerCase().trim(),
    });
  } catch (confirmErr) {
    console.error("Error auto-confirming tenant admin email:", confirmErr);
  }

  // Asegurar que la primera cuenta creada sea 'Sucursal principal'
  const branchName = tenant.nombre_sucursal || "Sucursal principal";
  const tenantToSave: Tenant = {
    ...tenant,
    nombre_sucursal: branchName,
    config: {
      ...DEFAULT_CONFIG,
      ...tenant.config,
      nombre_sucursal: branchName,
    },
  };

  // 2. Guardar la lavandería
  let tenantError;
  const { error: err1 } = await supabase.from("tenants").insert(tenantToSave);
  if (err1 && err1.message && err1.message.includes("nombre_sucursal")) {
    const { nombre_sucursal: _, ...fallbackTenant } = tenantToSave;
    const { error: err2 } = await supabase.from("tenants").insert(fallbackTenant);
    tenantError = err2;
  } else {
    tenantError = err1;
  }

  if (tenantError) {
    // Rollback Auth user — no se puede desde el cliente, pero al menos señalar el error
    throw new Error(
      "Error al crear lavandería: " + tenantError.message + ". Por favor contacta soporte.",
    );
  }

  // 3. Guardar el Administrador vinculado al ID de Auth
  const { password: _pw, ...empData } = admin;
  const { error: empError } = await supabase.from("empleados").insert({
    ...empData,
    avatar_url: admin.avatar_url || null,
    id: authData.user.id,
    password: "***",
  });

  if (empError) {
    // Rollback: eliminar el tenant creado
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(
      "Error al crear empleado: " + empError.message + ". Por favor intenta de nuevo.",
    );
  }

  // 4. Iniciar sesión
  await supabase.auth.signInWithPassword({
    email: admin.email,
    password: admin.password,
  });

  return { tenant: tenantToSave, user: authData.user };
}

export async function registerBranch(tenant: Tenant, admin: Empleado, userId: string) {
  const branchName =
    tenant.nombre_sucursal || tenant.config?.nombre_sucursal || "Sucursal principal";
  const tenantToSave: Tenant = {
    ...tenant,
    nombre_sucursal: branchName,
    config: {
      ...DEFAULT_CONFIG,
      ...tenant.config,
      nombre_sucursal: branchName,
    },
  };

  // 1. Guardar la lavandería
  let tenantError;
  const { error: err1 } = await supabase.from("tenants").insert(tenantToSave);
  if (err1 && err1.message && err1.message.includes("nombre_sucursal")) {
    const { nombre_sucursal: _, ...fallbackTenant } = tenantToSave;
    const { error: err2 } = await supabase.from("tenants").insert(fallbackTenant);
    tenantError = err2;
  } else {
    tenantError = err1;
  }

  if (tenantError) {
    throw new Error(
      "Error al crear sucursal: " + tenantError.message + ". Por favor contacta soporte.",
    );
  }

  // 2. Guardar el Administrador vinculado al ID de Auth existente
  const { password: _pw, ...empData } = admin;
  const { error: empError } = await supabase.from("empleados").insert({
    ...empData,
    avatar_url: admin.avatar_url || null,
    id: userId,
    tenant_id: tenant.id,
    password: "***",
  });

  if (empError) {
    // Rollback: eliminar el tenant creado
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(
      "Error al crear empleado: " + empError.message + ". Por favor intenta de nuevo.",
    );
  }

  return { tenant: tenantToSave };
}

export async function deleteTenant(id: string) {
  console.log(`[deleteTenant] Iniciando eliminación completa para tenant ID: ${id}`);

  // 1. Limpiar Archivos en Storage (Bucket 'catalogo')
  try {
    const { data: files } = await supabase.storage.from("catalogo").list(id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${id}/${f.name}`);
      await supabase.storage.from("catalogo").remove(paths);
      console.log(`Archivos de lavandería ${id} eliminados de Storage.`);
    }
  } catch (e) {
    console.warn("Aviso al limpiar archivos de Storage:", e);
  }

  // 2. Ejecutar eliminación en cascada completa en Supabase (Auth + DB)
  try {
    const { error: rpcError } = await supabase.rpc("admin_delete_tenant_complete", {
      target_tenant_id: id,
    });
    if (!rpcError) {
      console.log(
        `[deleteTenant] Lavandería ${id} y sus usuarios eliminados exitosamente vía RPC.`,
      );
      return;
    }
    console.warn(
      "Aviso en admin_delete_tenant_complete, ejecutando limpieza manual de respaldo...",
      rpcError,
    );
  } catch (rpcErr) {
    console.warn("Excepción al ejecutar admin_delete_tenant_complete:", rpcErr);
  }

  // 3. Fallback manual por si la RPC no estuviera disponible
  try {
    const emps = await getEmpleados(id);
    for (const emp of emps) {
      try {
        await supabase.rpc("admin_delete_user", { target_user_id: emp.id });
      } catch (errAuth) {
        console.warn(`No se pudo eliminar auth user ${emp.id}:`, errAuth);
      }
    }
  } catch (e) {
    console.warn("Aviso al limpiar usuarios de Auth:", e);
  }

  const relatedTables = [
    "orden_items",
    "abonos_credito",
    "movimientos_caja",
    "cajas",
    "gastos",
    "messages",
    "conversations",
    "notificaciones",
    "ecf_api_logs",
    "ecf_documentos_recibidos",
    "ecf_documents",
    "ecf_sequences",
    "ecf_config",
    "ordenes",
    "clientes",
    "catalogo_items",
    "servicios",
    "empleados",
  ];

  for (const table of relatedTables) {
    try {
      await supabase.from(table).delete().eq("tenant_id", id);
    } catch (_tblErr) {
      // Ignorar si la tabla no existe
    }
  }

  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar tenant de la tabla tenants:", error);
    throw error;
  }

  console.log(`[deleteTenant] Lavandería ${id} eliminada por completo.`);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  if (!slug || slug === "__loading__") return undefined;
  const cleanSlug = slug.toLowerCase();
  const cacheKey = `klynn_tenant_cache_${cleanSlug}`;

  // 1. Si no hay conexión o ya está en caché, intentar leer primero si offline
  if (typeof window !== "undefined" && !navigator.onLine) {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
  }

  // 2. Intentar buscar en Supabase con timeout de seguridad
  try {
    const fetchPromise = supabase.from("tenants").select("*").eq("slug", cleanSlug).maybeSingle();

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`klynn_tenant_id_${data.id}`, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {
    console.warn("Aviso al obtener tenant por slug:", e);
  }

  // Fallback a Server Function nativa (resuelve siempre en 1ms sin CORS)
  try {
    const serverTenant = await getTenantBySlugServer({ data: { slug: cleanSlug } });
    if (serverTenant) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(serverTenant));
        localStorage.setItem(`klynn_tenant_id_${serverTenant.id}`, JSON.stringify(serverTenant));
      }
      return serverTenant as Tenant;
    }
  } catch (e) {}

  // 3. Fallback a caché local si Supabase falló o está sin conexión
  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
  }

  return undefined;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  if (!id || id === "__loading__" || id === "undefined") return undefined;
  const cacheKey = `klynn_tenant_id_${id}`;

  if (typeof window !== "undefined" && !navigator.onLine) {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant?.id === id) return parsed.tenant;
      } catch {}
    }
  }

  try {
    const fetchPromise = supabase.from("tenants").select("*").eq("id", id).maybeSingle();
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        if (data.slug)
          localStorage.setItem(`klynn_tenant_cache_${data.slug}`, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant?.id === id) return parsed.tenant;
      } catch {}
    }
  }

  return undefined;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug.toLowerCase());
  return !data || data.length === 0;
}

export async function getTenantsForUser(email: string): Promise<Tenant[]> {
  const { data: emps, error: errEmps } = await supabase
    .from("empleados")
    .select("tenant_id")
    .eq("email", email.toLowerCase())
    .eq("activo", true);

  if (errEmps || !emps) return [];
  const tenantIds = Array.from(new Set(emps.map((e) => e.tenant_id)));

  const { data: tenants, error: errTenants } = await supabase
    .from("tenants")
    .select("*")
    .in("id", tenantIds);

  return tenants || [];
}

export async function updateTenantAdmin(tenant_id: string, newEmail: string, newPassword?: string) {
  const cleanEmail = newEmail.trim().toLowerCase();
  // Update Tenant Email
  await supabase.from("tenants").update({ email: cleanEmail }).eq("id", tenant_id);

  // Update Admin Employee
  const emps = await getEmpleados(tenant_id);
  const admin = emps.find((e) => e.rol === "ADMIN");
  if (admin) {
    const updates: Partial<Empleado> = { email: cleanEmail };

    if (admin.email && admin.email.trim().toLowerCase() !== cleanEmail) {
      // Actualizar el email en Supabase Auth mediante la función RPC segura
      try {
        await supabase.rpc("admin_set_user_email", {
          target_user_id: admin.id,
          new_email: cleanEmail,
        });
      } catch (e) {
        console.warn("Aviso al actualizar email en Auth:", e);
      }
    }

    if (newPassword && newPassword.trim()) {
      updates.password = "***"; // No guardamos texto plano
      // Actualizar en Auth mediante la función RPC segura
      try {
        await supabase.rpc("admin_set_user_password", {
          target_user_id: admin.id,
          new_password: newPassword.trim(),
        });
      } catch (e) {
        console.warn("Aviso al actualizar password en Auth:", e);
      }
    }
    await supabase.from("empleados").update(updates).eq("id", admin.id);
  }
}

export async function updateTenantPlan(tenantId: string, planId: PlanId, resetStartDate = false) {
  const updates: any = { plan_id: planId };
  if (resetStartDate) {
    updates.plan_fecha_inicio = new Date().toISOString();
  }
  const { error } = await supabase.from("tenants").update(updates).eq("id", tenantId);
  return !error;
}

export async function updateTenantStatus(
  tenantId: string,
  status: "TRIAL" | "ACTIVO" | "SUSPENDIDO" | "CANCELADO",
) {
  const { error } = await supabase.from("tenants").update({ estado: status }).eq("id", tenantId);
  return !error;
}

export async function updateTenantMaxSucursales(tenantId: string, maxSucursales: number) {
  const { error } = await supabase
    .from("tenants")
    .update({ max_sucursales: maxSucursales })
    .eq("id", tenantId);

  if (error) {
    console.error("Error updating tenant max_sucursales column:", error);
    return false;
  }
  return true;
}

export async function updateTenantTrialHasta(tenantId: string, trialHasta: string) {
  const { error } = await supabase
    .from("tenants")
    .update({ trial_hasta: trialHasta })
    .eq("id", tenantId);

  if (error) {
    console.error("Error updating tenant trial_hasta column:", error);
    return false;
  }
  return true;
}

export async function updateTenantModulosOverride(
  tenantId: string,
  overrides?: TenantConfig["modulos_override"] | null,
  mesesPagadosOverride?: number,
): Promise<boolean> {
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();

  if (fetchError) {
    console.error("Error fetching tenant config for override:", fetchError);
    return false;
  }

  const currentConfig = tenant?.config || {};
  const nextConfig: TenantConfig = {
    ...currentConfig,
    meses_pagados_override:
      mesesPagadosOverride !== undefined
        ? mesesPagadosOverride
        : currentConfig.meses_pagados_override,
  };

  if (overrides === undefined || overrides === null) {
    delete nextConfig.modulos_override;
  } else {
    nextConfig.modulos_override = overrides;
  }

  const { error } = await supabase
    .from("tenants")
    .update({ config: nextConfig })
    .eq("id", tenantId);

  if (error) {
    console.error("Error saving tenant config overrides:", error);
    return false;
  }
  return true;
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  requirePlanOnRegistration: true,
  trialDays: 14,
  defaultPlanId: "basico",
  requireEmployeeOtp: false,
  whatsapp_engine: "klynn_connect",
  klynn_connect_url: "https://wa.klynn.com.do",
  klynn_connect_apikey: "klynn_evolution_secret_key_2026",
  fiscal_environment_policy: "per_tenant",
  standby_sync_frequency: "2h",
  standby_last_sync_status: "OK",
  standby_last_sync_duration: "14s",
};

export async function getGlobalConfig(): Promise<GlobalConfig> {
  try {
    const { data, error } = await supabase
      .from("global_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      const bank = data.bank_details ?? data.bankDetails;
      return {
        requirePlanOnRegistration:
          data.require_plan_on_registration ??
          data.requirePlanOnRegistration ??
          DEFAULT_GLOBAL_CONFIG.requirePlanOnRegistration,
        trialDays: data.trial_days ?? data.trialDays ?? DEFAULT_GLOBAL_CONFIG.trialDays,
        defaultPlanId:
          data.default_plan_id ?? data.defaultPlanId ?? DEFAULT_GLOBAL_CONFIG.defaultPlanId,
        bankDetails: bank,
        requireEmployeeOtp:
          data.require_employee_otp ??
          bank?.require_employee_otp ??
          DEFAULT_GLOBAL_CONFIG.requireEmployeeOtp,
        whatsapp_engine:
          bank?.whatsapp_engine ??
          (data as any)?.whatsapp_engine ??
          DEFAULT_GLOBAL_CONFIG.whatsapp_engine,
        klynn_connect_url:
          bank?.klynn_connect_url ??
          (data as any)?.klynn_connect_url ??
          DEFAULT_GLOBAL_CONFIG.klynn_connect_url,
        klynn_connect_apikey:
          bank?.klynn_connect_apikey ??
          (data as any)?.klynn_connect_apikey ??
          DEFAULT_GLOBAL_CONFIG.klynn_connect_apikey,
        fiscal_environment_policy:
          (data as any)?.fiscal_environment_policy ??
          DEFAULT_GLOBAL_CONFIG.fiscal_environment_policy,
        standby_sync_frequency:
          bank?.standby_sync_frequency ??
          (data as any)?.standby_sync_frequency ??
          DEFAULT_GLOBAL_CONFIG.standby_sync_frequency,
        standby_last_sync_at: bank?.standby_last_sync_at ?? (data as any)?.standby_last_sync_at,
        standby_last_sync_duration:
          bank?.standby_last_sync_duration ??
          (data as any)?.standby_last_sync_duration ??
          DEFAULT_GLOBAL_CONFIG.standby_last_sync_duration,
        standby_last_sync_status:
          bank?.standby_last_sync_status ??
          (data as any)?.standby_last_sync_status ??
          DEFAULT_GLOBAL_CONFIG.standby_last_sync_status,
        standby_last_sync_metrics:
          bank?.standby_last_sync_metrics ?? (data as any)?.standby_last_sync_metrics,
      };
    }
  } catch (e) {
    console.error("Error fetching global config:", e);
  }
  return read<GlobalConfig>(KEY.globalConfig, DEFAULT_GLOBAL_CONFIG);
}

export async function saveGlobalConfig(config: GlobalConfig) {
  try {
    const bankDetailsToSave = {
      ...(config.bankDetails || {}),
      require_employee_otp: config.requireEmployeeOtp ?? false,
      whatsapp_engine: config.whatsapp_engine || "klynn_connect",
      klynn_connect_url: config.klynn_connect_url || "https://wa.klynn.com.do",
      klynn_connect_apikey: config.klynn_connect_apikey || "klynn_evolution_secret_key_2026",
      standby_sync_frequency: config.standby_sync_frequency || "2h",
      standby_last_sync_at: config.standby_last_sync_at,
      standby_last_sync_duration: config.standby_last_sync_duration || "14s",
      standby_last_sync_status: config.standby_last_sync_status || "OK",
      standby_last_sync_metrics: config.standby_last_sync_metrics,
    };

    const { error } = await supabase.from("global_config").upsert({
      id: 1,
      require_plan_on_registration: config.requirePlanOnRegistration,
      trial_days: config.trialDays,
      default_plan_id: config.defaultPlanId,
      fiscal_environment_policy: config.fiscal_environment_policy || "per_tenant",
      bank_details: bankDetailsToSave,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (e) {
    console.error("Error saving global config:", e);
    throw e;
  }
  write(KEY.globalConfig, config);
}

export async function triggerStandbySync(): Promise<{
  success: boolean;
  message?: string;
  duration?: string;
  timestamp?: string;
  status?: string;
  metrics?: {
    tenants: number;
    clientes: number;
    ordenes: number;
    functions: number;
  };
}> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/sync-standby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ action: "sync" }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error triggering standby sync:", err);
    return {
      success: false,
      message: err.message || "Error al comunicarse con la función de sincronización",
    };
  }
}

export async function updateStandbyFrequency(frequency: string): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynn.com.do";
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    await fetch(`${supabaseUrl}/functions/v1/sync-standby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ action: "schedule", frequency }),
    }).catch(console.warn);

    const current = await getGlobalConfig();
    await saveGlobalConfig({
      ...current,
      standby_sync_frequency: frequency as any,
    });
    return true;
  } catch (err) {
    console.error("Error updating standby frequency:", err);
    return false;
  }
}

export async function sendEmployeeSignUpOtp(
  email: string,
  password: string,
  nombre: string,
  tenantId: string,
  rol: RolEmpleado = "VENDEDOR",
) {
  const emailLower = email.toLowerCase().trim();
  const { data, error } = await supabase.auth.signUp({
    email: emailLower,
    password: password || "tempPassword123!",
    options: {
      data: {
        nombre,
        tenant_id: tenantId,
        rol,
      },
    },
  });
  if (error) {
    if (
      error.message.toLowerCase().includes("already registered") ||
      (error as any).status === 422
    ) {
      throw new Error(
        `El correo "${emailLower}" ya está registrado en el sistema. Por favor utiliza un correo diferente.`,
      );
    }
    throw error;
  }
  return data;
}

export async function resendEmployeeSignUpOtp(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: email.toLowerCase().trim(),
  });
  if (error) throw error;
  return data;
}

export async function verifyEmployeeOtpAndSave(
  otpToken: string,
  empleado: Empleado,
): Promise<Empleado> {
  const emailLower = empleado.email.toLowerCase().trim();

  // 1. Verificar OTP en Supabase Auth
  let verifyResult = await supabase.auth.verifyOtp({
    email: emailLower,
    token: otpToken.trim(),
    type: "signup",
  });

  if (verifyResult.error) {
    verifyResult = await supabase.auth.verifyOtp({
      email: emailLower,
      token: otpToken.trim(),
      type: "email",
    });
  }

  if (verifyResult.error) {
    throw new Error(verifyResult.error.message || "Código de verificación inválido o expirado");
  }

  const user = verifyResult.data.user;
  if (!user) throw new Error("No se pudo verificar el usuario");

  // 2. Guardar en la tabla public.empleados con el ID de Auth verificado
  const dataToSave = {
    ...empleado,
    id: user.id,
    email: emailLower,
    password: "***",
    nombre: empleado.nombre || "",
    apellido: empleado.apellido || "",
    pin: empleado.pin || "",
    avatar_url: empleado.avatar_url || null,
  };

  const { error: dbError } = await supabase.from("empleados").upsert(dataToSave);
  if (dbError) throw new Error("Error al guardar en base de datos: " + dbError.message);

  return dataToSave;
}

export async function getEmployeeInvitations(tenantId: string): Promise<EmployeeInvitation[]> {
  const { data, error } = await supabase
    .from("employee_invitations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    // Permite desplegar el frontend antes de aplicar la migración sin romper /personal.
    if (error.code === "42P01" || error.message?.includes("employee_invitations")) return [];
    throw error;
  }
  return (data || []) as EmployeeInvitation[];
}

export async function inviteEmployeeByEmail(
  tenantId: string,
  email: string,
  rol?: RolEmpleado,
  permisos?: string[]
): Promise<EmployeeInvitation> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/restablecer-contrasena?invitation=1`
      : "https://klynn.com.do/restablecer-contrasena?invitation=1";
  const { data, error } = await supabase.functions.invoke("employee-invitations", {
    body: {
      tenantId,
      email: email.trim().toLowerCase(),
      role: rol || "VENDEDOR",
      permissions: permisos || [],
      redirectTo,
    },
  });
  if (error) {
    let message = error.message || "No se pudo enviar la invitación";
    try {
      const context = (error as any).context;
      if (context && typeof context.json === "function") {
        const body = await context.json();
        if (body?.error) message = body.error;
      }
    } catch {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.invitation) throw new Error("La invitación no devolvió confirmación");
  return data.invitation as EmployeeInvitation;
}

export async function deleteExpiredEmployeeInvitation(
  invitationId: string,
  tenantId: string,
): Promise<void> {
  try {
    await supabase
      .from("employee_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("tenant_id", tenantId);
  } catch (err) {
    console.warn("Error eliminando invitación expirada:", err);
  }
}

export async function resendEmployeeInvitation(
  tenantId: string,
  email: string,
  invitationId?: string,
): Promise<void> {
  await inviteEmployeeByEmail(tenantId, email);
}

export async function sendWeeklySummaryTest(
  tenantId: string,
  channel: "email" | "whatsapp" | "both",
  frequency: "weekly" | "monthly",
): Promise<{ sent: string[]; failed: Array<{ channel: string; error: string }> }> {
  const { data, error } = await supabase.functions.invoke("weekly-business-summary", {
    body: { action: "test", tenantId, channel, frequency },
  });
  if (error) {
    let message = error.message || "No se pudo enviar el resumen de prueba";
    try {
      const context = (error as any).context;
      if (context && typeof context.json === "function") {
        const body = await context.json();
        if (body?.error) message = body.error;
      }
    } catch {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return {
    sent: Array.isArray(data?.sent) ? data.sent : [],
    failed: Array.isArray(data?.failed) ? data.failed : [],
  };
}

// ============ Empleados (Supabase) ============
export async function getEmpleados(tenant_id?: string): Promise<Empleado[]> {
  const cacheKey = tenant_id ? `klynn_empleados_${tenant_id}` : "klynn_empleados_all";

  // 1. Si estamos offline, leer inmediatamente de caché local y de lastAuth
  if (typeof window !== "undefined" && !navigator.onLine) {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (
          parsed?.empleado &&
          (!tenant_id || isSameTenant(parsed.empleado.tenant_id, tenant_id))
        ) {
          return [parsed.empleado];
        }
      } catch {}
    }
    const local = read<Empleado[]>(KEY.empleados, []);
    if (tenant_id) return local.filter((e) => isSameTenant(e.tenant_id, tenant_id));
    return local;
  }

  // 2. Intentar Supabase con timeout de 2000ms
  try {
    let query = supabase.from("empleados").select("*");
    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    const fetchPromise = query.order("nombre");

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
      write(KEY.empleados, data);
      return data;
    }
  } catch (e) {
    console.warn("Aviso al obtener empleados de Supabase:", e);
  }

  // 3. Fallback a caché
  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (
          parsed?.empleado &&
          (!tenant_id || isSameTenant(parsed.empleado.tenant_id, tenant_id))
        ) {
          return [parsed.empleado];
        }
      } catch {}
    }
  }

  const local = read<Empleado[]>(KEY.empleados, []);
  if (tenant_id) return local.filter((e) => isSameTenant(e.tenant_id, tenant_id));
  return local;
}

export async function saveEmpleado(e: Empleado) {
  let authErrorMsg = "";
  const emailLower = e.email.toLowerCase().trim();

  console.log("Iniciando guardado de empleado:", { email: emailLower, id: e.id });

  // 0. Registrar o sincronizar en Supabase Auth
  let isNew = false;
  if (!e.id || e.id.startsWith("emp_")) {
    isNew = true;
  } else {
    const { data: existing } = await supabase
      .from("empleados")
      .select("id")
      .eq("id", e.id)
      .maybeSingle();
    isNew = !existing;
  }

  if (isNew) {
    try {
      console.log("Intentando crear cuenta en Auth...");
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || "",
        import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: emailLower,
        password: e.password || "tempPassword123!",
        options: { data: { nombre: e.nombre, tenant_id: e.tenant_id, rol: e.rol } },
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes("already registered") ||
          authError.status === 422
        ) {
          throw new Error(
            `El correo "${emailLower}" ya está registrado en el sistema. Por favor utiliza un correo electrónico diferente para este empleado.`,
          );
        } else {
          console.error("SIGNUP ERROR:", authError);
          throw new Error("Error de Auth al crear empleado: " + authError.message);
        }
      } else if (authData?.user) {
        console.log("Cuenta Auth creada exitosamente:", authData.user.id);

        // Auto-confirmar el email del nuevo usuario en Auth para evitar que quede atascado sin confirmación
        try {
          await supabase.rpc("admin_set_user_email", {
            target_user_id: authData.user.id,
            new_email: emailLower,
          });
          console.log("Email auto-confirmado para el nuevo empleado");
        } catch (confirmErr) {
          console.error("Error al auto-confirmar email:", confirmErr);
        }

        // AUTO-HEALING: Si el usuario ya existía en public.empleados con un ID viejo desincronizado,
        // actualizamos ese ID viejo en la DB para que coincida con el nuevo ID válido de Auth.
        const { data: existingByEmail } = await supabase
          .from("empleados")
          .select("id")
          .eq("email", emailLower)
          .maybeSingle();

        if (existingByEmail && existingByEmail.id !== authData.user.id) {
          console.log(
            `Corrigiendo inconsistencia: actualizando ID viejo ${existingByEmail.id} a nuevo ID de Auth ${authData.user.id}`,
          );
          await supabase
            .from("empleados")
            .update({ id: authData.user.id })
            .eq("id", existingByEmail.id);
        }

        e.id = authData.user.id;
      }
    } catch (err: any) {
      console.error("EXCEPCION AUTH:", err);
      throw err;
    }
  } else {
    // 1. Manejo de Seguridad en Supabase Auth para edición de usuario existente
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Caso especial: El usuario se actualiza a sí mismo
      if (currentUser && currentUser.id === e.id) {
        if (e.password && e.password.length >= 6 && e.password !== "***") {
          console.log("Auto-actualización de contraseña...");
          const { error: updateError } = await supabase.auth.updateUser({ password: e.password });
          if (updateError) authErrorMsg = "Error auto-update: " + updateError.message;
        }

        if (currentUser.email?.toLowerCase() !== emailLower) {
          console.log("Auto-actualización de email...");
          const { error: emailError } = await supabase.auth.updateUser({ email: emailLower });
          if (emailError)
            authErrorMsg =
              (authErrorMsg ? authErrorMsg + " " : "") +
              "Error auto-update email: " +
              emailError.message;
        }
      } else if (e.id && e.id.length === 36) {
        // Actualizar usuario existente (empleado) que ya tiene ID de Auth (UUID)
        if (e.password && e.password.length >= 6 && e.password !== "***") {
          console.log("Actualizando contraseña de usuario UUID en Auth via RPC...");
          const { error: rpcError } = await supabase.rpc("admin_set_user_password", {
            target_user_id: e.id,
            new_password: e.password,
          });
          if (rpcError) console.error("RPC ERROR:", rpcError);
        }

        // Sincronizar el correo en Auth via RPC
        console.log("Actualizando correo de usuario UUID en Auth via RPC...");
        const { error: emailRpcError } = await supabase.rpc("admin_set_user_email", {
          target_user_id: e.id,
          new_email: emailLower,
        });
        if (emailRpcError) console.error("RPC EMAIL ERROR:", emailRpcError);
      }
    } catch (err: any) {
      console.error("EXCEPCION AUTH:", err);
      authErrorMsg = "Excepción: " + err.message;
    }
  }

  // 2. Guardar en la tabla empleados
  const dataToSave = {
    ...e,
    email: emailLower,
    password: "***",
    nombre: e.nombre || "",
    apellido: e.apellido || "",
    pin: e.pin || "",
    avatar_url: e.avatar_url || null,
  };

  console.log("Upsert en tabla empleados:", dataToSave);
  const { error: dbError } = await supabase.from("empleados").upsert(dataToSave);

  if (dbError) {
    console.error("DB ERROR:", dbError);
    throw new Error("Error DB: " + dbError.message);
  }

  if (authErrorMsg) throw new Error(authErrorMsg);
  console.log("GUARDADO COMPLETADO EXITOSAMENTE");
}

export async function deleteEmpleado(id: string) {
  // 1. Borrar de la tabla empleados primero (elimina el registro del negocio inmediatamente)
  const { error: dbError } = await supabase.from("empleados").delete().eq("id", id);
  if (dbError) {
    console.error("Error al eliminar empleado de la base de datos:", dbError);
    throw dbError;
  }

  // 2. Intentar limpiar la cuenta de autenticación en Auth en segundo plano
  if (id && id.length === 36) {
    try {
      const { error: rpcError } = await supabase.rpc("admin_delete_user", { target_user_id: id });
      if (rpcError) {
        console.warn("Aviso al limpiar usuario en Auth (RPC admin_delete_user):", rpcError.message);
      }
    } catch (e: any) {
      console.warn("Aviso al invocar admin_delete_user:", e);
    }
  }
}

export async function getEmpleadoById(id: string): Promise<Empleado | undefined> {
  if (!id || id === "__loading__" || id === "undefined") return undefined;
  const cacheKey = `klynn_emp_id_${id}`;

  if (typeof window !== "undefined" && !navigator.onLine) {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.empleado?.id === id) return parsed.empleado;
      } catch {}
    }
  }

  try {
    const fetchPromise = supabase.from("empleados").select("*").eq("id", id).maybeSingle();
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {}

  // Fallback a Server Function nativa (evita cualquier bloqueo de CORS en localhost)
  try {
    const serverEmp = await getEmpleadoByIdServer({ data: { id } });
    if (serverEmp) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(serverEmp));
      }
      return serverEmp as Empleado;
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.empleado?.id === id) return parsed.empleado;
      } catch {}
    }
  }

  return undefined;
}

// ============ Clientes (Supabase) ============
export async function getClientes(tenant_id: string): Promise<Cliente[]> {
  const realId = resolveTenantId(tenant_id);

  // 1. Si no hay conexión, devolver inmediatamente de memoria local
  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<Cliente[]>(KEY.clientes, []).filter(
      (c) => isSameTenant(c.tenant_id, tenant_id) || isSameTenant(c.tenant_id, realId),
    );
    if (local.length > 0) return local;
    try {
      const idbClis = await offlineDB.getAll<Cliente>("clientes");
      if (idbClis && idbClis.length > 0) {
        return idbClis.filter(
          (c) => isSameTenant(c.tenant_id, tenant_id) || isSameTenant(c.tenant_id, realId),
        );
      }
    } catch {}
    return local;
  }

  // 2. Buscar en Supabase con paginación automática por bloques de 1000
  try {
    const PAGE_SIZE = 1000;
    let allData: Cliente[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("tenant_id", realId)
        .order("nombre")
        .range(from, from + PAGE_SIZE - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    if (allData.length > 0) {
      if (isBrowser()) {
        const local = read<Cliente[]>(KEY.clientes, []).filter(
          (c) => isSameTenant(c.tenant_id, tenant_id) || isSameTenant(c.tenant_id, realId),
        );
        const combined = [...allData];
        local.forEach((lc) => {
          if (!combined.some((sc) => sc.id === lc.id)) combined.push(lc);
        });
        write(KEY.clientes, combined);
        try {
          offlineDB.putMany("clientes", combined);
        } catch {}
        return combined;
      }
      return allData;
    }
  } catch (e) {
    console.warn("Aviso al consultar clientes en Supabase:", e);
  }

  return read<Cliente[]>(KEY.clientes, []).filter(
    (c) => isSameTenant(c.tenant_id, tenant_id) || isSameTenant(c.tenant_id, realId),
  );
}

export async function saveCliente(c: Cliente) {
  // 1. Guardar siempre en IndexedDB y localStorage para disponibilidad inmediata
  try {
    await offlineDB.put("clientes", c);
  } catch (idbErr) {
    console.warn("IndexedDB save cliente warning:", idbErr);
  }

  const local = read<Cliente[]>(KEY.clientes, []);
  const exists = local.findIndex((x) => x.id === c.id);
  if (exists >= 0) local[exists] = c;
  else local.push(c);
  write(KEY.clientes, local);

  // 2. Intentar guardar en Supabase si hay red; de lo contrario, encolar en Outbox
  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: c.id,
      tenant_id: c.tenant_id,
      table_name: "clientes",
      action: "UPSERT",
      payload: c,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("clientes").upsert(c);
    if (error) throw error;
  } catch (err) {
    console.warn("Offline outbox fallback for cliente:", err);
    await offlineDB.addToOutbox({
      id: c.id,
      tenant_id: c.tenant_id,
      table_name: "clientes",
      action: "UPSERT",
      payload: c,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteCliente(id: string) {
  const local = read<Cliente[]>(KEY.clientes, []);
  const target = local.find((item) => item.id === id);
  if (isBrowser())
    write(
      KEY.clientes,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("clientes", id);
  } catch {}
  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id)
      throw new Error("No se pudo determinar la lavandería del cliente eliminado.");
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "clientes",
      action: "DELETE",
      payload: { id },
    });
    return;
  }
  try {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!target?.tenant_id) throw error;
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "clientes",
      action: "DELETE",
      payload: { id },
    });
  }
}

export async function getClienteById(id: string): Promise<Cliente | undefined> {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).single();
  if (error) return undefined;
  return data;
}

// ============ Órdenes (Supabase) ============
export async function getOrdenes(tenant_id: string): Promise<Orden[]> {
  const realId = resolveTenantId(tenant_id);

  // 1. Si no hay conexión, devolver inmediatamente de memoria local
  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<Orden[]>(KEY.ordenes, [])
      .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
      .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
    if (local.length > 0) return local;
    try {
      const idbOrds = await offlineDB.getAll<Orden>("ordenes");
      if (idbOrds && idbOrds.length > 0) {
        return idbOrds
          .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
          .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
      }
    } catch {}
    return local;
  }

  // 2. Buscar en Supabase con paginación automática por bloques de 1000 para superar el límite de PostgREST
  try {
    const PAGE_SIZE = 1000;
    let allData: Orden[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .eq("tenant_id", realId)
        .order("creado_en", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    if (allData.length > 0) {
      if (isBrowser()) {
        const local = read<Orden[]>(KEY.ordenes, []).filter(
          (o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId),
        );
        const combined = [...allData];
        local.forEach((lo) => {
          if (!combined.some((co) => co.id === lo.id)) combined.push(lo);
        });
        const sorted = combined.sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
        write(KEY.ordenes, sorted);
        try {
          offlineDB.putMany("ordenes", sorted);
        } catch {}
        return sorted;
      }
      return allData;
    }
  } catch (e) {
    console.warn("Aviso al consultar órdenes en Supabase:", e);
  }

  return read<Orden[]>(KEY.ordenes, [])
    .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
    .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
}

export async function getOrdenesByPeriod(filters: {
  tenant_id: string;
  empleado_id?: string;
  desde?: string;
  hasta?: string;
}): Promise<Orden[]> {
  const realId = resolveTenantId(filters.tenant_id);
  if (typeof window !== "undefined" && !navigator.onLine) {
    const all = await getOrdenes(filters.tenant_id);
    return all.filter((o) => {
      if (
        filters.empleado_id &&
        filters.empleado_id !== "all" &&
        o.empleado_id !== filters.empleado_id
      )
        return false;
      if (filters.desde && o.creado_en < filters.desde) return false;
      if (filters.hasta && o.creado_en > filters.hasta + "T23:59:59Z") return false;
      return true;
    });
  }

  try {
    let query = supabase.from("ordenes").select("*").eq("tenant_id", realId);

    if (filters.empleado_id && filters.empleado_id !== "all") {
      query = query.eq("empleado_id", filters.empleado_id);
    }

    if (filters.desde) {
      query = query.gte("creado_en", filters.desde);
    }

    if (filters.hasta) {
      query = query.lte("creado_en", filters.hasta + "T23:59:59Z");
    }

    const { data, error } = await query.order("creado_en", { ascending: false }).range(0, 4999);
    if (!error && data) return data;
  } catch (e) {}

  const all = await getOrdenes(filters.tenant_id);
  return all.filter((o) => {
    if (
      filters.empleado_id &&
      filters.empleado_id !== "all" &&
      o.empleado_id !== filters.empleado_id
    )
      return false;
    if (filters.desde && o.creado_en < filters.desde) return false;
    if (filters.hasta && o.creado_en > filters.hasta + "T23:59:59Z") return false;
    return true;
  });
}

export async function saveOrden(o: Orden) {
  // 1. Guardar de inmediato en IndexedDB y localStorage (0 latencia)
  try {
    await offlineDB.put("ordenes", o);
  } catch (idbErr) {
    console.warn("IndexedDB save order warning:", idbErr);
  }

  const local = read<Orden[]>(KEY.ordenes, []);
  const exists = local.findIndex((x) => x.id === o.id);
  if (exists >= 0) local[exists] = o;
  else local.push(o);
  write(KEY.ordenes, local);

  // 2. Si estamos sin conexión, agregar directamente a la cola Outbox
  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: o.id,
      tenant_id: o.tenant_id,
      table_name: "ordenes",
      action: "UPSERT",
      payload: o,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  // 3. Intentar guardar en Supabase; si falla por timeout o corte, encolar en Outbox
  try {
    const { error } = await supabase.from("ordenes").upsert(o);
    if (error) throw error;
  } catch (err) {
    console.warn("Offline outbox fallback for orden:", err);
    await offlineDB.addToOutbox({
      id: o.id,
      tenant_id: o.tenant_id,
      table_name: "ordenes",
      action: "UPSERT",
      payload: o,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function updateOrdenEstado(id: string, estado: EstadoOrden, ubicacion_ropa?: string) {
  const updates: Record<string, any> = { estado };
  if (ubicacion_ropa !== undefined) updates.ubicacion_ropa = ubicacion_ropa;

  const local = read<Orden[]>(KEY.ordenes, []);
  const idx = local.findIndex((x) => x.id === id);
  if (idx >= 0) {
    local[idx].estado = estado;
    if (ubicacion_ropa !== undefined) local[idx].ubicacion_ropa = ubicacion_ropa;
    write(KEY.ordenes, local);
    try {
      offlineDB.put("ordenes", local[idx]);
    } catch {}
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: id,
      tenant_id: local[idx]?.tenant_id || "default",
      table_name: "ordenes",
      action: "UPDATE",
      payload: updates,
    });
    return;
  }

  try {
    const { error } = await supabase.from("ordenes").update(updates).eq("id", id);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: id,
      tenant_id: local[idx]?.tenant_id || "default",
      table_name: "ordenes",
      action: "UPDATE",
      payload: updates,
    });
  }
}

export async function getOrdenById(id: string): Promise<Orden | undefined> {
  const local = read<Orden[]>(KEY.ordenes, []);
  const match = local.find((o) => o.id === id);
  if (match) return match;

  if (typeof window !== "undefined" && !navigator.onLine) {
    return undefined;
  }

  try {
    const { data, error } = await supabase.from("ordenes").select("*").eq("id", id).single();
    if (error) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

export { computeNextOrderSequence, extractOrderSequenceNumber } from "./order-sequence";

export async function nextOrdenNumero(tenant_id: string): Promise<string> {
  const realId = resolveTenantId(tenant_id);
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;

  // 1. Recopilar números locales existentes (localStorage y IndexedDB outbox)
  const localSeqs: number[] = [];
  try {
    const local = read<Orden[]>(KEY.ordenes, []).filter(
      (o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId),
    );
    for (const o of local) {
      const n = extractOrderSequenceNumber(o.numero, ym);
      if (n) localSeqs.push(n);
    }
  } catch {}

  try {
    if (typeof window !== "undefined") {
      const outbox = await offlineDB.getPendingOutbox(realId);
      for (const item of outbox) {
        if (item.table_name === "ordenes" && item.payload?.numero) {
          const n = extractOrderSequenceNumber(item.payload.numero, ym);
          if (n) localSeqs.push(n);
        }
      }
    }
  } catch {}

  // 2. Si no hay conexión a internet, resolver con las secuencias locales
  if (typeof window !== "undefined" && !navigator.onLine) {
    const next = computeNextOrderSequence(localSeqs);
    return `KL-${ym}-${String(next).padStart(4, "0")}`;
  }

  // 3. Consultar la base de datos en Supabase para obtener las órdenes recientes del tenant
  try {
    const { data, error } = await supabase
      .from("ordenes")
      .select("numero")
      .eq("tenant_id", realId)
      .ilike("numero", `KL-${ym}-%`)
      .order("creado_en", { ascending: false })
      .limit(1000);

    const remoteSeqs: number[] = [];
    if (!error && data && data.length > 0) {
      for (const row of data) {
        const n = extractOrderSequenceNumber(row.numero, ym);
        if (n) remoteSeqs.push(n);
      }
    }

    const allSeqs = [...localSeqs, ...remoteSeqs];
    const next = computeNextOrderSequence(allSeqs);
    return `KL-${ym}-${String(next).padStart(4, "0")}`;
  } catch (e) {
    const next = computeNextOrderSequence(localSeqs);
    return `KL-${ym}-${String(next).padStart(4, "0")}`;
  }
}

export const nextNumeroOrden = nextOrdenNumero;

// ============ Caja (Supabase) ============
export async function getCajas(tenant_id: string): Promise<Caja[]> {
  const realId = resolveTenantId(tenant_id);
  if (typeof window !== "undefined" && !navigator.onLine) {
    return read<Caja[]>(KEY.cajas, []).filter(
      (c) => c.tenant_id === realId || c.tenant_id === tenant_id,
    );
  }

  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id}`
        : `tenant_id.eq.${realId}`;

    const fetchPromise = supabase
      .from("cajas")
      .select("*")
      .or(filter)
      .order("abierta_en", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const local = read<Caja[]>(KEY.cajas, []);
      const otherCajas = local.filter((c) => c.tenant_id !== realId && c.tenant_id !== tenant_id);
      write(KEY.cajas, [...data, ...otherCajas]);
      try {
        offlineDB.putMany("cajas", data);
      } catch {}
      return data;
    }
  } catch (e) {}

  return read<Caja[]>(KEY.cajas, []).filter(
    (c) => c.tenant_id === realId || c.tenant_id === tenant_id,
  );
}

export async function getHistoricoCierres(filters: {
  tenant_id: string;
  empleado_id?: string;
  desde?: string;
  hasta?: string;
}): Promise<Caja[]> {
  const realId = resolveTenantId(filters.tenant_id);
  if (typeof window !== "undefined" && !navigator.onLine) {
    const all = await getCajas(filters.tenant_id);
    return all.filter((c) => c.estado === "CERRADA");
  }

  try {
    const filter =
      realId !== filters.tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${filters.tenant_id}`
        : `tenant_id.eq.${realId}`;

    let query = supabase.from("cajas").select("*").or(filter).eq("estado", "CERRADA");

    if (filters.empleado_id && filters.empleado_id !== "all") {
      query = query.eq("empleado_id", filters.empleado_id);
    }

    if (filters.desde) {
      query = query.gte("abierta_en", filters.desde);
    }

    if (filters.hasta) {
      query = query.lte("abierta_en", filters.hasta + "T23:59:59Z");
    }

    const fetchPromise = query.order("cerrada_en", { ascending: false });
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (!error && data) return data;
  } catch (e) {}

  const all = await getCajas(filters.tenant_id);
  return all.filter((c) => c.estado === "CERRADA");
}

export async function getCajaAbierta(tenant_id: string): Promise<Caja | null> {
  if (!tenant_id || tenant_id === "admin" || tenant_id === "__loading__") return null;
  const realId = resolveTenantId(tenant_id);

  // 1. Si estamos sin conexión, verificar inmediatamente en memoria local
  if (typeof window !== "undefined" && !navigator.onLine) {
    const localCajas = read<Caja[]>(KEY.cajas, []);
    const openCaja = localCajas.find(
      (c) => (c.tenant_id === realId || c.tenant_id === tenant_id) && c.estado === "ABIERTA",
    );
    return openCaja || null;
  }

  // 2. Intentar buscar en Supabase con timeout de 2000ms
  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id}`
        : `tenant_id.eq.${realId}`;

    const fetchPromise = supabase
      .from("cajas")
      .select("*")
      .or(filter)
      .eq("estado", "ABIERTA")
      .order("abierta_en", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data && data.length > 0) {
      const localCajas = read<Caja[]>(KEY.cajas, []);
      const idx = localCajas.findIndex((c) => c.id === data[0].id);
      if (idx >= 0) localCajas[idx] = data[0];
      else localCajas.push(data[0]);
      write(KEY.cajas, localCajas);
      return data[0];
    }
  } catch (e) {}

  const localCajas = read<Caja[]>(KEY.cajas, []);
  const openCaja = localCajas.find(
    (c) => (c.tenant_id === realId || c.tenant_id === tenant_id) && c.estado === "ABIERTA",
  );
  return openCaja || null;
}

export async function saveCaja(c: Caja) {
  const realId = resolveTenantId(c.tenant_id);
  const cajaToSave = { ...c, tenant_id: realId };
  try {
    await offlineDB.put("cajas", cajaToSave);
  } catch {}

  const local = read<Caja[]>(KEY.cajas, []);
  const exists = local.findIndex((x) => x.id === cajaToSave.id);
  if (exists >= 0) local[exists] = cajaToSave;
  else local.push(cajaToSave);
  write(KEY.cajas, local);

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: cajaToSave.id,
      tenant_id: realId,
      table_name: "cajas",
      action: "UPSERT",
      payload: cajaToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("cajas").upsert(cajaToSave);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: cajaToSave.id,
      tenant_id: realId,
      table_name: "cajas",
      action: "UPSERT",
      payload: cajaToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function getMovimientos(
  tenant_id: string,
  caja_id?: string,
): Promise<MovimientoCaja[]> {
  const realId = resolveTenantId(tenant_id);
  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<MovimientoCaja[]>(KEY.movimientos, []);
    return local.filter(
      (m) =>
        (m.tenant_id === realId || m.tenant_id === tenant_id) &&
        (!caja_id || m.caja_id === caja_id),
    );
  }

  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id}`
        : `tenant_id.eq.${realId}`;

    let query = supabase.from("movimientos_caja").select("*").or(filter);
    if (caja_id) query = query.eq("caja_id", caja_id);
    const fetchPromise = query.order("creado_en", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const local = read<MovimientoCaja[]>(KEY.movimientos, []);
      const otherMovs = local.filter((m) => m.tenant_id !== realId && m.tenant_id !== tenant_id);
      write(KEY.movimientos, [...data, ...otherMovs]);
      try {
        offlineDB.putMany("movimientos_caja", data);
      } catch {}
      return data;
    }
  } catch (e) {}

  const local = read<MovimientoCaja[]>(KEY.movimientos, []);
  return local.filter(
    (m) =>
      (m.tenant_id === realId || m.tenant_id === tenant_id) && (!caja_id || m.caja_id === caja_id),
  );
}

export async function saveMovimiento(m: MovimientoCaja) {
  const realId = resolveTenantId(m.tenant_id);
  const movToSave = { ...m, tenant_id: realId };
  try {
    await offlineDB.put("movimientos_caja", movToSave);
  } catch {}

  const local = read<MovimientoCaja[]>(KEY.movimientos, []);
  if (!local.some((x) => x.id === movToSave.id)) {
    local.push(movToSave);
  }
  write(KEY.movimientos, local);

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: movToSave.id,
      tenant_id: realId,
      table_name: "movimientos_caja",
      action: "INSERT",
      payload: movToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("movimientos_caja").insert(movToSave);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: movToSave.id,
      tenant_id: realId,
      table_name: "movimientos_caja",
      action: "INSERT",
      payload: movToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

// ============ Gastos (Supabase) ============
export async function getGastos(tenant_id: string): Promise<Gasto[]> {
  const realId = resolveTenantId(tenant_id);
  if (typeof window !== "undefined" && !navigator.onLine) {
    return read<Gasto[]>(KEY.gastos, []).filter(
      (g) => g.tenant_id === realId || g.tenant_id === tenant_id,
    );
  }

  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id}`
        : `tenant_id.eq.${realId}`;

    const fetchPromise = supabase
      .from("gastos")
      .select("*")
      .or(filter)
      .order("fecha", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const local = read<Gasto[]>(KEY.gastos, []);
      const otherGastos = local.filter((g) => g.tenant_id !== realId && g.tenant_id !== tenant_id);
      write(KEY.gastos, [...data, ...otherGastos]);
      return data;
    }
  } catch (e) {}

  return read<Gasto[]>(KEY.gastos, []).filter(
    (g) => g.tenant_id === realId || g.tenant_id === tenant_id,
  );
}

export async function saveGasto(g: Gasto) {
  const realId = resolveTenantId(g.tenant_id);
  const gastoToSave = { ...g, tenant_id: realId };
  try {
    await offlineDB.put("gastos", gastoToSave);
  } catch {}

  const local = read<Gasto[]>(KEY.gastos, []);
  const exists = local.findIndex((x) => x.id === gastoToSave.id);
  if (exists >= 0) local[exists] = gastoToSave;
  else local.push(gastoToSave);
  write(KEY.gastos, local);

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: gastoToSave.id,
      tenant_id: realId,
      table_name: "gastos",
      action: "UPSERT",
      payload: gastoToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("gastos").upsert(gastoToSave);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: gastoToSave.id,
      tenant_id: realId,
      table_name: "gastos",
      action: "UPSERT",
      payload: gastoToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteGasto(id: string) {
  const local = read<Gasto[]>(KEY.gastos, []);
  const target = local.find((item) => item.id === id);
  if (isBrowser())
    write(
      KEY.gastos,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("gastos", id);
  } catch {}
  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id)
      throw new Error("No se pudo determinar la lavandería del gasto eliminado.");
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "gastos",
      action: "DELETE",
      payload: { id },
    });
    return;
  }
  try {
    await supabase.from("movimientos_caja").delete().eq("referencia", id);
  } catch (e) {}
  try {
    const { error } = await supabase.from("gastos").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!target?.tenant_id) throw error;
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "gastos",
      action: "DELETE",
      payload: { id },
    });
  }
}

// ============ Catálogo (Supabase) ============
export async function getCatalogo(tenant_id: string): Promise<CatalogoItem[]> {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const realId = resolveTenantId(tenant_id);

  // 1. Si estamos sin conexión, devolver inmediatamente del almacenamiento local
  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<CatalogoItem[]>(KEY.catalogo, []);
    const relevant = local.filter(
      (i) => isSameTenant(i.tenant_id, tenant_id) || i.tenant_id === "admin",
    );
    if (relevant.length > 0) return relevant;
    return CATALOGO_PRENDAS_PREDEFINIDAS as any;
  }

  // 2. Intentar buscar en Supabase con timeout de 3000ms
  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id},tenant_id.eq.admin`
        : `tenant_id.eq.${realId},tenant_id.eq.admin`;

    const fetchPromise = supabase
      .from("catalogo_items")
      .select("*")
      .or(filter)
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 3000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data && data.length > 0) {
      const finalItems: CatalogoItem[] = [];
      const namesSet = new Set<string>();

      data
        .filter((i: any) => i.tenant_id !== "admin")
        .forEach((i: any) => {
          finalItems.push(i);
          namesSet.add(normalize(i.nombre));
        });

      data
        .filter((i: any) => i.tenant_id === "admin")
        .forEach((i: any) => {
          if (!namesSet.has(normalize(i.nombre))) {
            finalItems.push(i);
          }
        });

      write(KEY.catalogo, finalItems);
      try {
        offlineDB.putMany("catalogo_prendas", finalItems);
      } catch {}
      return finalItems;
    }
  } catch (e) {
    console.warn("Aviso al cargar catálogo:", e);
  }

  const local = read<CatalogoItem[]>(KEY.catalogo, []);
  const relevant = local.filter(
    (i) => isSameTenant(i.tenant_id, tenant_id) || i.tenant_id === "admin",
  );
  if (relevant.length > 0) return relevant;
  return CATALOGO_PRENDAS_PREDEFINIDAS as any;
}

export async function saveCatalogoItem(item: CatalogoItem) {
  if (!item.tenant_id || item.tenant_id === "__loading__") {
    console.error("saveCatalogoItem: tenant_id inválido, abortando.", item.tenant_id);
    throw new Error("tenant_id inválido");
  }

  const itemToSave = { ...item, tenant_id: resolveTenantId(item.tenant_id) };

  const local = read<CatalogoItem[]>(KEY.catalogo, []);
  const exists = local.findIndex((x) => x.id === itemToSave.id);
  if (exists >= 0) local[exists] = itemToSave;
  else local.push(itemToSave);
  write(KEY.catalogo, local);
  try {
    offlineDB.put("catalogo_prendas", itemToSave);
  } catch {}

  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: itemToSave.id,
      tenant_id: itemToSave.tenant_id,
      table_name: "catalogo_items",
      action: "UPSERT",
      payload: itemToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  try {
    const { error } = await supabase.from("catalogo_items").upsert(itemToSave);
    if (error) throw error;
  } catch (err) {
    await offlineDB.addToOutbox({
      id: itemToSave.id,
      tenant_id: itemToSave.tenant_id,
      table_name: "catalogo_items",
      action: "UPSERT",
      payload: itemToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteCatalogoItem(id: string) {
  const local = read<CatalogoItem[]>(KEY.catalogo, []);
  const target = local.find((item) => item.id === id);
  if (typeof window !== "undefined")
    write(
      KEY.catalogo,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("catalogo_prendas", id);
  } catch {}
  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id)
      throw new Error("No se pudo determinar la lavandería del artículo eliminado.");
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "catalogo_items",
      action: "DELETE",
      payload: { id },
    });
    return;
  }
  try {
    const { error } = await supabase.from("catalogo_items").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!target?.tenant_id) throw error;
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "catalogo_items",
      action: "DELETE",
      payload: { id },
    });
  }
}

// ============ Servicios (Supabase) ============
export async function getServicios(tenant_id: string): Promise<Servicio[]> {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const deduplicate = (services: Servicio[]): Servicio[] => {
    const byName = new Map<string, Servicio>();
    for (const service of services) {
      const key = normalize(String(service.nombre || "").trim());
      if (!key) continue;
      const current = byName.get(key);
      if (!current) {
        byName.set(key, service);
        continue;
      }

      const serviceIsTenantOwned = service.tenant_id !== "admin";
      const currentIsTenantOwned = current.tenant_id !== "admin";
      const serviceHasPrice = Number(service.precio || 0) > 0;
      const currentHasPrice = Number(current.precio || 0) > 0;

      if (
        (serviceIsTenantOwned && !currentIsTenantOwned) ||
        (serviceIsTenantOwned === currentIsTenantOwned && serviceHasPrice && !currentHasPrice)
      ) {
        byName.set(key, service);
      }
    }
    return Array.from(byName.values());
  };

  const realId = resolveTenantId(tenant_id);

  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<Servicio[]>(KEY.servicios, []);
    const relevant = local.filter(
      (s) => isSameTenant(s.tenant_id, tenant_id) || s.tenant_id === "admin",
    );
    if (relevant.length > 0) return deduplicate(relevant);
    return deduplicate(SERVICIOS_PREDEFINIDOS as any);
  }

  try {
    const filter =
      realId !== tenant_id
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenant_id},tenant_id.eq.admin`
        : `tenant_id.eq.${realId},tenant_id.eq.admin`;

    const fetchPromise = supabase
      .from("servicios")
      .select("*")
      .or(filter)
      .order("nombre", { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 3000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data && data.length > 0) {
      const finalItems = deduplicate(data as Servicio[]);

      write(KEY.servicios, finalItems);
      try {
        offlineDB.putMany("catalogo_servicios", finalItems);
      } catch {}
      return finalItems;
    }
  } catch (e) {
    console.warn("Aviso al cargar servicios:", e);
  }

  const local = read<Servicio[]>(KEY.servicios, []);
  const relevant = local.filter(
    (s) => isSameTenant(s.tenant_id, tenant_id) || s.tenant_id === "admin",
  );
  if (relevant.length > 0) return deduplicate(relevant);
  return deduplicate(SERVICIOS_PREDEFINIDOS as any);
}

export async function saveServicio(s: Servicio) {
  // Guard: never save with an invalid tenant_id
  if (!s.tenant_id || s.tenant_id === "__loading__") {
    console.error("saveServicio: tenant_id inválido, abortando.", s.tenant_id);
    throw new Error("tenant_id inválido");
  }
  const sToSave = { ...s, tenant_id: resolveTenantId(s.tenant_id) };
  const local = read<Servicio[]>(KEY.servicios, []);
  const index = local.findIndex((item) => item.id === sToSave.id);
  if (index >= 0) local[index] = sToSave;
  else local.push(sToSave);
  write(KEY.servicios, local);
  try {
    await offlineDB.put("catalogo_servicios", sToSave);
  } catch {}
  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: sToSave.id,
      tenant_id: sToSave.tenant_id,
      table_name: "servicios",
      action: "UPSERT",
      payload: sToSave,
    });
    return;
  }
  try {
    const { error } = await supabase.from("servicios").upsert(sToSave);
    if (error) throw error;
  } catch (error) {
    await offlineDB.addToOutbox({
      id: sToSave.id,
      tenant_id: sToSave.tenant_id,
      table_name: "servicios",
      action: "UPSERT",
      payload: sToSave,
    });
  }
}

export async function deleteServicio(id: string) {
  const local = read<Servicio[]>(KEY.servicios, []);
  const target = local.find((item) => item.id === id);
  if (isBrowser())
    write(
      KEY.servicios,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("catalogo_servicios", id);
  } catch {}
  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id)
      throw new Error("No se pudo determinar la lavandería del servicio eliminado.");
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "servicios",
      action: "DELETE",
      payload: { id },
    });
    return;
  }
  try {
    const { error } = await supabase.from("servicios").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!target?.tenant_id) throw error;
    await offlineDB.addToOutbox({
      id,
      tenant_id: resolveTenantId(target.tenant_id),
      table_name: "servicios",
      action: "DELETE",
      payload: { id },
    });
  }
}

// ============ Plans CRUD ============
export async function savePlan(p: Plan) {
  // 1. Actualizar caché en localStorage inmediatamente
  const all = read<Plan[]>(KEY.plans, []) || [];
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = { ...p };
  else all.push({ ...p });
  write(KEY.plans, all);

  // 2. Actualizar caché en memoria inmediatamente
  if (_cachedPlans) {
    const idx = _cachedPlans.findIndex((x) => x.id === p.id);
    if (idx >= 0) _cachedPlans[idx] = { ...p };
    else _cachedPlans.push({ ...p });
  }

  try {
    // 3. Guardar en Supabase incluyendo estanteria y procesos
    const { error } = await supabase.from("planes").upsert({
      id: p.id,
      nombre: p.nombre,
      precio_mensual: p.precio_mensual,
      precio_anual: p.precio_anual,
      limite_empleados: p.limite_empleados,
      limite_ordenes_mes: p.limite_ordenes_mes,
      whatsapp: !!p.modulos?.whatsapp,
      facturacion_fiscal: !!p.modulos?.facturacion_fiscal,
      multisucursal: !!p.modulos?.multisucursal,
      logistica: !!p.modulos?.logistica,
      procesos: !!p.modulos?.procesos,
      estanteria: !!p.modulos?.estanteria,
      pos_offline: !!p.modulos?.pos_offline,
      limite_whatsapp_mes: p.limite_whatsapp_mes,
      destacado: !!p.destacado,
      es_especial: !!p.es_especial,
      titulo_especial: p.titulo_especial || "Plan especial",
      polar_product_monthly_url: p.polar_product_monthly_url,
      polar_product_yearly_url: p.polar_product_yearly_url,
      precio_sucursal_adicional: p.precio_sucursal_adicional,
      polar_sucursal_url: p.polar_sucursal_url,
      limite_sucursales_adicionales: p.limite_sucursales_adicionales,
    });
    if (error) {
      console.error("Error upserting plan in Supabase:", error);
    }
  } catch (e) {
    console.error("Error saving plan:", e);
  }
}

export async function deletePlan(id: PlanId) {
  try {
    const { error } = await supabase.from("planes").delete().eq("id", id);
    if (error) console.error("Error deleting plan from Supabase:", error);
  } catch (e) {
    console.error("Error deleting plan:", e);
  }
  const all = await getPlans();
  write(
    KEY.plans,
    all.filter((p) => p.id !== id),
  );
}

// ============ Sesión / tenant activo ============
export function setActiveTenant(slug: string) {
  if (isBrowser()) localStorage.setItem(KEY.active, slug);
}
export async function getActiveTenant(): Promise<Tenant | undefined> {
  if (!isBrowser()) return undefined;
  const slug = localStorage.getItem(KEY.active);
  return slug ? await getTenantBySlug(slug) : undefined;
}

export interface Session {
  empleado_id: string;
  tenant_id: string;
  iniciado_en: string;
  auth_verified_at?: string;
  offline_expires_at?: string;
}
export function getSession(): Session | null {
  const session = read<Session | null>(KEY.session, null);
  if (!session) return null;
  const fallbackExpiry = Date.parse(session.iniciado_en || "") + 12 * 60 * 60 * 1000;
  const expiresAt = session.offline_expires_at
    ? Date.parse(session.offline_expires_at)
    : fallbackExpiry;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    if (isBrowser()) localStorage.removeItem(KEY.session);
    return null;
  }
  return session;
}
export function setSession(s: Session | null) {
  if (s) {
    const verifiedAt = s.auth_verified_at || new Date().toISOString();
    write(KEY.session, {
      ...s,
      auth_verified_at: verifiedAt,
      offline_expires_at:
        s.offline_expires_at ||
        new Date(Date.parse(verifiedAt) + 12 * 60 * 60 * 1000).toISOString(),
    });
  } else if (isBrowser()) localStorage.removeItem(KEY.session);
}

async function cacheEmployeeForOffline(emp: Empleado, password: string): Promise<void> {
  const offlineAuth = await createOfflineAuthVerifier(password);
  const cached: OfflineCachedEmpleado = {
    ...emp,
    password: "***",
    pin: undefined,
    _offline_auth: offlineAuth,
  };
  await offlineDB.put("auth_cache", cached);
}

async function authenticateCachedEmployee(
  tenantId: string,
  cleanEmail: string,
  password: string,
): Promise<{ ok: true; empleado: Empleado } | { ok: false; error: string }> {
  const cachedEmps = await offlineDB.getAll<OfflineCachedEmpleado>("auth_cache", tenantId);
  const matched = cachedEmps.find(
    (employee) =>
      employee.email.toLowerCase() === cleanEmail &&
      employee.activo &&
      employee.tenant_id === tenantId,
  );
  if (!matched?._offline_auth) {
    return {
      ok: false,
      error:
        "Este usuario todavía no está habilitado para acceso offline. Inicia sesión una vez con internet en este dispositivo.",
    };
  }
  if (isOfflineAuthExpired(matched._offline_auth)) {
    return {
      ok: false,
      error: "La autorización offline expiró. Conéctate a internet para renovarla.",
    };
  }
  if (isOfflineAuthLocked(matched._offline_auth)) {
    return {
      ok: false,
      error: "Acceso offline bloqueado temporalmente por varios intentos fallidos.",
    };
  }
  const valid = await verifyOfflinePassword(password, matched._offline_auth);
  if (!valid) {
    matched._offline_auth = recordOfflineAuthFailure(matched._offline_auth);
    await offlineDB.put("auth_cache", matched);
    return { ok: false, error: "Contraseña incorrecta." };
  }
  matched._offline_auth = recordOfflineAuthSuccess(matched._offline_auth);
  await offlineDB.put("auth_cache", matched);
  const { _offline_auth: _auth, ...employee } = matched;
  return { ok: true, empleado: employee };
}

export async function login(
  slug: string,
  email: string,
  password: string,
): Promise<{ ok: true; empleado: Empleado; tenant: Tenant } | { ok: false; error: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Verificar el Tenant (desde memoria/caché si estamos offline)
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { ok: false, error: "Lavandería no encontrada" };

  // 2. Si estamos sin conexión (Offline Auth Mode)
  if (typeof window !== "undefined" && !navigator.onLine) {
    try {
      const offlineResult = await authenticateCachedEmployee(tenant.id, cleanEmail, password);
      if (!offlineResult.ok) return offlineResult;
      const matchedEmp = offlineResult.empleado;
      setSession({
        empleado_id: matchedEmp.id,
        tenant_id: tenant.id,
        iniciado_en: new Date().toISOString(),
      });
      setActiveTenant(slug);
      return { ok: true, empleado: matchedEmp, tenant };
    } catch (offlineErr) {
      console.warn("Error en validación offline:", offlineErr);
      return { ok: false, error: "No se pudo validar de forma segura el acceso offline." };
    }
  }

  // 3. Autenticar en Supabase Auth Online
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      // Si el error es de red / Failed to fetch, intentar fallback offline
      if (
        authError.message?.toLowerCase().includes("fetch") ||
        authError.message?.toLowerCase().includes("network")
      ) {
        const offlineResult = await authenticateCachedEmployee(tenant.id, cleanEmail, password);
        if (offlineResult.ok) {
          const matchedEmp = offlineResult.empleado;
          setSession({
            empleado_id: matchedEmp.id,
            tenant_id: tenant.id,
            iniciado_en: new Date().toISOString(),
          });
          setActiveTenant(slug);
          return { ok: true, empleado: matchedEmp, tenant };
        }
        return offlineResult;
      }

      // Consultar si el empleado existe para este tenant
      try {
        const { data: empCheck } = await supabase
          .from("empleados")
          .select("id")
          .ilike("email", cleanEmail)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (!empCheck) {
          return {
            ok: false,
            error: "No existe ninguna cuenta registrada con este correo en esta lavandería.",
          };
        }
      } catch {}

      return {
        ok: false,
        error: "Contraseña incorrecta. Verifica tu contraseña o usa '¿Olvidaste tu contraseña?'.",
      };
    }

    if (!authData.user) return { ok: false, error: "Error de autenticación" };

    // 4. Obtener el perfil del empleado (usando el ID de Auth o por email fallback)
    let emp = await getEmpleadoById(authData.user.id);
    if (!emp) {
      const { data: empByEmail } = await supabase
        .from("empleados")
        .select("*")
        .ilike("email", cleanEmail)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (empByEmail) {
        emp = empByEmail;
        if (emp.id !== authData.user.id) {
          await supabase.from("empleados").update({ id: authData.user.id }).eq("id", emp.id);
          emp.id = authData.user.id;
        }
      } else {
        try {
          const serverEmp = await getEmpleadoByEmailAndTenantServer({
            data: { email: cleanEmail, tenantId: tenant.id },
          });
          if (serverEmp) {
            emp = serverEmp as Empleado;
          }
        } catch (e) {}
      }
    }

    // Validar que el empleado exista, esté activo y pertenezca a esta lavandería
    if (!emp || !emp.activo || emp.tenant_id !== tenant.id) {
      await supabase.auth.signOut();
      return { ok: false, error: "Acceso denegado para esta sucursal" };
    }

    // Guardar en caché offline para permitir acceso futuro si se va la luz/red
    try {
      await cacheEmployeeForOffline(emp, password);
    } catch {}

    setSession({
      empleado_id: emp.id,
      tenant_id: tenant.id,
      iniciado_en: new Date().toISOString(),
    });
    setActiveTenant(slug);
    return { ok: true, empleado: emp, tenant };
  } catch (err: any) {
    // Fallback de contingencia si falló la conexión
    try {
      const offlineResult = await authenticateCachedEmployee(tenant.id, cleanEmail, password);
      if (offlineResult.ok) {
        const matchedEmp = offlineResult.empleado;
        setSession({
          empleado_id: matchedEmp.id,
          tenant_id: tenant.id,
          iniciado_en: new Date().toISOString(),
        });
        setActiveTenant(slug);
        return { ok: true, empleado: matchedEmp, tenant };
      }
      return offlineResult;
    } catch {}

    return { ok: false, error: "Error de conexión: " + (err.message || "Intente de nuevo") };
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Error signing out from Supabase:", e);
  }
  setSession(null);
  if (typeof window !== "undefined") {
    try {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.removeItem("klynn_last_auth_user");
      localStorage.removeItem("klynn_active_tenant");
      localStorage.removeItem("lvx:session");
      localStorage.removeItem("lvx:active_tenant");
      localStorage.removeItem("klynn_emp_id_admin");
      localStorage.removeItem("klynn_read_virtuals");
      localStorage.removeItem("klynn_deleted_virtuals");
      // Limpiar cachés de tenants y empleados para evitar filtración de perfiles
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("klynn_tenant_cache_") ||
          key.startsWith("klynn_tenant_id_") ||
          key.startsWith("klynn_emp_id_") ||
          key.startsWith("klynn_empleados_")
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }
}

export async function switchSession(tenantId: string, email: string): Promise<boolean> {
  // En Auth real, el cambio de sesión requiere que el usuario tenga acceso a ambos
  const emps = await getEmpleados(tenantId);
  const emp = emps.find((e) => e.email.toLowerCase() === email.toLowerCase() && e.activo);
  if (!emp) return false;
  setSession({ empleado_id: emp.id, tenant_id: tenantId, iniciado_en: new Date().toISOString() });
  const tenant = await getTenantById(tenantId);
  if (tenant) setActiveTenant(tenant.slug);
  return true;
}

export async function getCurrentUser(): Promise<{ empleado: Empleado; tenant: Tenant } | null> {
  const cacheUserResult = (empleado: Empleado, tenant: Tenant) => {
    if (typeof window !== "undefined") {
      try {
        const safeEmployee = { ...empleado, password: "***", pin: undefined };
        localStorage.setItem(
          "klynn_last_auth_user",
          JSON.stringify({ empleado: safeEmployee, tenant }),
        );
        localStorage.setItem(`klynn_emp_id_${empleado.id}`, JSON.stringify(safeEmployee));
        localStorage.setItem(`klynn_tenant_id_${tenant.id}`, JSON.stringify(tenant));
        if (tenant.slug) {
          localStorage.setItem(`klynn_tenant_cache_${tenant.slug}`, JSON.stringify(tenant));
          localStorage.setItem("klynn_active_tenant", tenant.slug);
        }
      } catch {}
    }
  };

  const session = getSession();

  // 1. Si estamos sin conexión, recuperar la sesión estrictamente desde sesión activa verificada
  if (typeof window !== "undefined" && !navigator.onLine) {
    if (session?.empleado_id && session?.tenant_id) {
      const emp = await getEmpleadoById(session.empleado_id);
      const ten = await getTenantById(session.tenant_id);
      if (emp && ten && emp.activo && isSameTenant(emp.tenant_id, ten.id)) {
        cacheUserResult(emp, ten);
        return { empleado: emp, tenant: ten };
      }
    }
    return null;
  }

  // 2. Consultar usuario autenticado real en Supabase con timeout de seguridad
  let user: any = null;
  try {
    const fetchUser = supabase.auth.getUser();
    const timeoutUser = new Promise<{ data: any }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 4000),
    );
    const res = await Promise.race([fetchUser, timeoutUser]);
    user = res.data?.user;
  } catch (e) {
    console.warn("Aviso al verificar usuario en Supabase Auth:", e);
  }

  // 3. Si no hay usuario autenticado devuelto directamente por Supabase Auth (ej. token en renovación)
  if (!user) {
    // Si tenemos una sesión local previa activa, recuperar el empleado y tenant sin cerrar la sesión
    if (session?.empleado_id && session?.tenant_id) {
      if (session.empleado_id === "admin" && session.tenant_id === "admin") {
        const empAdmin = {
          id: "admin",
          tenant_id: "admin",
          nombre: "Super Admin",
          email: "admin@klynn.com.do",
          rol: "ADMIN",
          activo: true,
          permisos: PERMISOS_SISTEMA.map((p) => p.id),
          creado_en: new Date().toISOString(),
        } as any;
        const tenAdmin = { id: "admin", nombre: "Administración Global", slug: "admin" } as any;
        cacheUserResult(empAdmin, tenAdmin);
        return { empleado: empAdmin, tenant: tenAdmin };
      }

      const emp = await getEmpleadoById(session.empleado_id);
      const ten = await getTenantById(session.tenant_id);
      if (emp && ten && emp.activo && isSameTenant(emp.tenant_id, ten.id)) {
        cacheUserResult(emp, ten);
        return { empleado: emp, tenant: ten };
      }
    }

    // Sin usuario Supabase ni sesión local vigente no se confía en perfiles sueltos de localStorage.
    return null;
  }

  const email = user.email?.toLowerCase().trim();
  const isSuperAdmin = email && ADMIN_EMAILS.includes(email);

  // Caso 1: Es Super Admin
  if (isSuperAdmin) {
    if (session?.tenant_id && session.tenant_id !== "admin") {
      const ten = await getTenantById(session.tenant_id);
      if (ten) {
        const emp: Empleado = {
          id: "admin",
          tenant_id: ten.id,
          nombre: "Super Admin",
          email: email || "admin@klynn.com.do",
          password: "***",
          rol: "ADMIN",
          activo: true,
          permisos: PERMISOS_SISTEMA.map((p) => p.id),
          creado_en: new Date().toISOString(),
        };
        cacheUserResult(emp, ten);
        return { empleado: emp, tenant: ten };
      }
    }
    const empAdmin = {
      id: "admin",
      tenant_id: "admin",
      nombre: "Super Admin",
      email: email || "admin@klynn.com.do",
      rol: "ADMIN",
      activo: true,
      permisos: PERMISOS_SISTEMA.map((p) => p.id),
      creado_en: new Date().toISOString(),
    } as any;
    const tenAdmin = { id: "admin", nombre: "Administración Global", slug: "admin" } as any;
    cacheUserResult(empAdmin, tenAdmin);
    return {
      empleado: empAdmin,
      tenant: tenAdmin,
    };
  }

  // Caso 2: Usuario regular (buscar sus perfiles de empleado activos)
  const { data: empsRaw, error: empsErr } = await supabase
    .from("empleados")
    .select("*")
    .ilike("email", email)
    .eq("activo", true);

  if (empsErr || !empsRaw || empsRaw.length === 0) {
    if (isBrowser()) {
      localStorage.removeItem(KEY.session);
      localStorage.removeItem("lvx:session");
      localStorage.removeItem("klynn_last_auth_user");
    }
    return null;
  }

  // Priorizar cuentas ADMIN sobre otros roles
  const emps = [...empsRaw].sort((a, b) => (a.rol === "ADMIN" ? -1 : b.rol === "ADMIN" ? 1 : 0));

  // A. Buscar coincidencia con la sesión previa guardada
  if (session?.tenant_id) {
    const empMatch = emps.find((e) => isSameTenant(e.tenant_id, session!.tenant_id));
    if (empMatch) {
      const ten = await getTenantById(empMatch.tenant_id);
      if (ten) {
        setSession({
          empleado_id: empMatch.id,
          tenant_id: ten.id,
          iniciado_en: new Date().toISOString(),
        });
        cacheUserResult(empMatch, ten);
        return { empleado: empMatch, tenant: ten };
      }
    }
  }

  // B. Buscar coincidencia con el slug en la URL actual
  const urlMatch =
    typeof window !== "undefined" ? window.location.pathname.match(/^\/t\/([^/]+)/) : null;
  const currentSlug = urlMatch
    ? urlMatch[1]
    : isBrowser()
      ? localStorage.getItem(KEY.active)
      : null;
  if (currentSlug && currentSlug !== "admin") {
    const ten = await getTenantBySlug(currentSlug);
    if (ten) {
      const empMatch = emps.find((e) => isSameTenant(e.tenant_id, ten.id));
      if (empMatch) {
        setSession({
          empleado_id: empMatch.id,
          tenant_id: ten.id,
          iniciado_en: new Date().toISOString(),
        });
        cacheUserResult(empMatch, ten);
        return { empleado: empMatch, tenant: ten };
      }
    }
  }

  // C. Fallback a la primera lavandería autorizada para este usuario
  const emp = emps[0];
  const ten = await getTenantById(emp.tenant_id);
  if (ten) {
    setSession({ empleado_id: emp.id, tenant_id: ten.id, iniciado_en: new Date().toISOString() });
    cacheUserResult(emp, ten);
    return { empleado: emp, tenant: ten };
  }

  return null;
}

export function getBillingCycleStart(
  planStartDateStr: string | Date,
  now: Date = new Date(),
): Date {
  const start = new Date(planStartDateStr);
  if (isNaN(start.getTime())) return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  if (now < start)
    return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = start.getDate();

  let cycleStart = new Date(year, month, day, 0, 0, 0, 0);

  // Manejar el desbordamiento de fin de mes (ej. si el mes tiene menos días que el día de aniversario)
  if (cycleStart.getDate() !== day) {
    cycleStart = new Date(year, month + 1, 0, 0, 0, 0, 0);
  }

  // Si la fecha calculada está en el futuro, el ciclo actual comenzó en el mes anterior
  if (cycleStart > now) {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = year - 1;
    }
    cycleStart = new Date(prevYear, prevMonth, day, 0, 0, 0, 0);
    if (cycleStart.getDate() !== day) {
      cycleStart = new Date(prevYear, prevMonth + 1, 0, 0, 0, 0, 0);
    }
  }

  return cycleStart;
}

export async function getMonthlyOrderCount(
  tenantId: string,
  planFechaInicio?: string,
): Promise<number> {
  const all = (await getOrdenes(tenantId)).filter((o) => o.estado !== "ANULADA");

  let refDateStr = planFechaInicio;
  if (!refDateStr) {
    const t = await getTenantById(tenantId);
    refDateStr = t?.plan_fecha_inicio || t?.creado_en;
  }

  if (!refDateStr) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return all.filter((o) => {
      const d = new Date(o.creado_en);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }

  const now = new Date();
  const cycleStart = getBillingCycleStart(refDateStr, now);

  return all.filter((o) => {
    const d = new Date(o.creado_en);
    return d >= cycleStart;
  }).length;
}

export const GRACE_ORDERS_BONUS = 15;

export async function checkPlanLimits(tenant: Tenant | string) {
  // Asegurar que tenemos el objeto tenant completo
  const t = typeof tenant === "string" ? await getTenantById(tenant) : tenant;
  if (!t || t.id === "__loading__") {
    const baseLimit = PLANS[0].limite_ordenes_mes;
    const effectiveLimit = baseLimit !== null ? baseLimit + GRACE_ORDERS_BONUS : null;
    return {
      plan: PLANS[0],
      orderCount: 0,
      employeeCount: 0,
      ordersReached: false,
      employeesReached: false,
      orderLimit: baseLimit,
      effectiveLimit,
      employeeLimit: PLANS[0].limite_empleados,
      isGracePeriod: false,
      graceRemaining: GRACE_ORDERS_BONUS,
      graceUsed: 0,
      graceBonus: GRACE_ORDERS_BONUS,
    };
  }

  const plans = await getPlans();
  const plan = plans.find((p) => p.id === t.plan_id) || PLANS[0];

  const orderCount = await getMonthlyOrderCount(t.id, t.plan_fecha_inicio || t.creado_en);
  const employeeCount = (await getEmpleados(t.id)).filter((e) => e.rol !== "ADMIN").length;

  const baseLimit = plan.limite_ordenes_mes;
  const effectiveLimit = baseLimit !== null ? baseLimit + GRACE_ORDERS_BONUS : null;

  const isGracePeriod =
    baseLimit !== null && orderCount >= baseLimit && orderCount < (effectiveLimit ?? 0);
  const ordersReached = effectiveLimit !== null && orderCount >= effectiveLimit;
  const employeesReached = employeeCount >= plan.limite_empleados;

  const graceUsed = isGracePeriod
    ? Math.max(0, orderCount - baseLimit)
    : baseLimit !== null && orderCount >= (effectiveLimit ?? 0)
      ? GRACE_ORDERS_BONUS
      : 0;
  const graceRemaining =
    isGracePeriod && effectiveLimit !== null
      ? Math.max(0, effectiveLimit - orderCount)
      : orderCount < (baseLimit ?? Infinity)
        ? GRACE_ORDERS_BONUS
        : 0;

  return {
    plan,
    orderCount,
    employeeCount,
    ordersReached,
    employeesReached,
    orderLimit: baseLimit,
    effectiveLimit,
    employeeLimit: plan.limite_empleados,
    isGracePeriod,
    graceRemaining,
    graceUsed,
    graceBonus: GRACE_ORDERS_BONUS,
  };
}

// ============ Helpers ============
export function uid(_prefix = "id"): string {
  return crypto.randomUUID();
}
export function formatRD(n: number): string {
  // en-US for comma thousands + period decimal, prefixed with RD$
  return `RD$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
}
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}
/** Parse "1,234.56" or "1234.56" into number. */
export function parseAmount(raw: string): number {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
/** Format while typing: keeps decimals user is typing. */
export function formatAmountInput(raw: string): string {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const intFmt = new Intl.NumberFormat("en-US").format(Number(intPart || "0"));
  if (parts.length === 1) return intFmt;
  const dec = parts.slice(1).join("").slice(0, 2);
  return `${intFmt}.${dec}`;
}
export function formatPhoneRD(raw: string): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 3) return d;
  if (d.length < 4) return `(${d})`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
export function formatCedulaRD(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
}
export function formatDateRD(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function formatDateTimeRD(iso: string): string {
  if (!iso || iso === "null") return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // Fallback to original string if invalid date format
  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ============ Permissions ============
export function can(empleado: Empleado, action: string): boolean {
  if (!empleado) return false;
  if (empleado.rol === "ADMIN") return true;

  const defaults = getPermisosPorRol(empleado.rol);

  if (empleado.permisos && Array.isArray(empleado.permisos)) {
    if (empleado.permisos.includes(action)) return true;
    // Retrocompatibilidad: Si el permiso es 'procesos' y el rol lo tiene por defecto
    if (action === "procesos" && defaults.includes("procesos")) {
      return true;
    }
    return false;
  }

  return defaults.includes(action);
}

export async function migrateLocalDataToSupabase(tenant_id: string) {
  const results = { ordenes: 0, clientes: 0, catalogo: 0, gastos: 0, movimientos: 0 };
  if (!isBrowser()) return results;

  // 1. Clientes
  let localClientes = read<Cliente[]>(KEY.clientes, []);
  let localOrds = read<Orden[]>(KEY.ordenes, []);

  // REPARACIÓN PRE-MIGRACIÓN: Corregir IDs no-UUID (generic-...)
  const oldToNewId = new Map<string, string>();
  localClientes = localClientes
    .map((c) => {
      if (!c || !c.id) return c;
      if (typeof c.id === "string" && c.id.startsWith("generic-")) {
        const isPersona = c.id.includes("consumidor");
        const tid = c.tenant_id || tenant_id;
        const newId = tid.substring(0, 24) + (isPersona ? "f000" : "e000") + tid.substring(28);
        oldToNewId.set(c.id, newId);
        return { ...c, id: newId, tenant_id: tid };
      }
      return c;
    })
    .filter(Boolean);

  if (oldToNewId.size > 0) {
    // Actualizar órdenes locales que apuntaban a los IDs viejos
    localOrds = localOrds
      .map((o) => {
        if (!o) return o;
        if (oldToNewId.has(o.cliente_id)) {
          return { ...o, cliente_id: oldToNewId.get(o.cliente_id)! };
        }
        return o;
      })
      .filter(Boolean);
    // Guardar los cambios locales antes de seguir
    write(KEY.clientes, localClientes);
    write(KEY.ordenes, localOrds);
  }

  const toMigrateClientes = localClientes.filter((x) => x.tenant_id === tenant_id);
  const failedClientesIds = new Set<string>();
  for (let c of toMigrateClientes) {
    try {
      // REPARAR DATOS: Si tiene tipo "Persona" o le falta limite_credito
      if (c.tipo === ("Persona" as any)) c.tipo = "Consumidor Final";
      if (c.limite_credito === undefined) c.limite_credito = 0;

      const { error } = await supabase.from("clientes").upsert(c);
      if (error) {
        console.error("Migrate Cliente error:", error);
        failedClientesIds.add(c.id);
      } else {
        results.clientes++;
      }
    } catch (e) {
      console.error("Migrate Cliente network error:", e);
      failedClientesIds.add(c.id);
    }
  }

  // 2. Órdenes
  const toMigrateOrds = localOrds.filter((x) => x.tenant_id === tenant_id);
  const failedOrdsIds = new Set<string>();
  for (const o of toMigrateOrds) {
    try {
      const { error } = await supabase.from("ordenes").upsert(o);
      if (error) {
        console.error("Migrate Orden error:", error);
        failedOrdsIds.add(o.id);
      } else {
        results.ordenes++;
      }
    } catch (e) {
      console.error("Migrate Orden network error:", e);
      failedOrdsIds.add(o.id);
    }
  }

  // 3. Catálogo
  const localCat = read<CatalogoItem[]>(KEY.catalogo, []);
  const toMigrateCat = localCat.filter((x) => x.tenant_id === tenant_id);
  const failedCatIds = new Set<string>();
  for (const item of toMigrateCat) {
    try {
      const { error } = await supabase.from("catalogo_items").upsert(item);
      if (error) {
        console.error("Migrate Catalogo error:", error);
        failedCatIds.add(item.id);
      } else {
        results.catalogo++;
      }
    } catch (e) {
      console.error("Migrate Catalogo network error:", e);
      failedCatIds.add(item.id);
    }
  }

  // 4. Gastos
  const localGastos = read<Gasto[]>(KEY.gastos, []);
  const toMigrateGastos = localGastos.filter((x) => x.tenant_id === tenant_id);
  const failedGastosIds = new Set<string>();
  for (const g of toMigrateGastos) {
    try {
      const { error } = await supabase.from("gastos").upsert(g);
      if (error) {
        console.error("Migrate Gasto error:", error);
        failedGastosIds.add(g.id);
      } else {
        results.gastos++;
      }
    } catch (e) {
      console.error("Migrate Gasto network error:", e);
      failedGastosIds.add(g.id);
    }
  }

  // 5. Movimientos
  const localMovs = read<MovimientoCaja[]>(KEY.movimientos, []);
  const toMigrateMovs = localMovs.filter((x) => x.tenant_id === tenant_id);
  const failedMovsIds = new Set<string>();
  for (const m of toMigrateMovs) {
    try {
      const { error } = await supabase.from("movimientos_caja").upsert(m);
      if (error) {
        console.error("Migrate Movimiento error:", error);
        failedMovsIds.add(m.id);
      } else {
        results.movimientos++;
      }
    } catch (e) {
      console.error("Migrate Movimiento network error:", e);
      failedMovsIds.add(m.id);
    }
  }

  // Limpiar solo lo que se migró exitosamente
  if (results.clientes > 0)
    write(
      KEY.clientes,
      localClientes.filter((x) => x.tenant_id !== tenant_id || failedClientesIds.has(x.id)),
    );
  if (results.ordenes > 0)
    write(
      KEY.ordenes,
      localOrds.filter((x) => x.tenant_id !== tenant_id || failedOrdsIds.has(x.id)),
    );
  if (results.catalogo > 0)
    write(
      KEY.catalogo,
      localCat.filter((x) => x.tenant_id !== tenant_id || failedCatIds.has(x.id)),
    );
  if (results.gastos > 0)
    write(
      KEY.gastos,
      localGastos.filter((x) => x.tenant_id !== tenant_id || failedGastosIds.has(x.id)),
    );
  if (results.movimientos > 0)
    write(
      KEY.movimientos,
      localMovs.filter((x) => x.tenant_id !== tenant_id || failedMovsIds.has(x.id)),
    );

  return results;
}

// ============ Demo seed enriquecido ============
export async function seedDemoIfEmpty() {
  // En producción SaaS Multi-Tenant no se inyectan datos de prueba falsos en localStorage del usuario
  return;
}

/** Incrementa el contador de WhatsApp del tenant y maneja reinicios mensuales */
export async function incrementWhatsAppCount(tenantId: string) {
  // 1. Obtener datos actuales
  const { data: t, error: fetchErr } = await supabase
    .from("tenants")
    .select("whatsapp_sent_month, whatsapp_last_reset")
    .eq("id", tenantId)
    .single();

  if (fetchErr || !t) return;

  const now = new Date();
  const lastReset = t.whatsapp_last_reset ? new Date(t.whatsapp_last_reset) : null;

  // Si el mes ha cambiado desde el último reset, reiniciamos a 1
  let nextCount = (t.whatsapp_sent_month || 0) + 1;
  let nextReset = t.whatsapp_last_reset;

  if (
    !lastReset ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    nextCount = 1;
    nextReset = now.toISOString();
  }

  await supabase
    .from("tenants")
    .update({
      whatsapp_sent_month: nextCount,
      whatsapp_last_reset: nextReset,
    })
    .eq("id", tenantId);
}

// ============ ECF Storage Functions ============

export async function getECFConfig(tenantId: string): Promise<ECFConfig | null> {
  const realId = resolveTenantId(tenantId);
  const cacheKey = `klynn_ecf_cfg_${realId}`;
  if (typeof window !== "undefined" && !navigator.onLine) {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_cfg_${tenantId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return null;
  }

  try {
    const filter =
      realId !== tenantId
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenantId}`
        : `tenant_id.eq.${realId}`;

    const fetchPromise = supabase.from("ecf_config").select("*").or(filter).maybeSingle();

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`klynn_ecf_cfg_${tenantId}`, JSON.stringify(data));
      }
      return data;
    }
  } catch {}

  if (typeof window !== "undefined") {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_cfg_${tenantId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return null;
}

export async function saveECFConfig(config: ECFConfig) {
  const realId = resolveTenantId(config.tenant_id);
  const configToSave = { ...config, tenant_id: realId };
  const cacheKey = `klynn_ecf_cfg_${realId}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(cacheKey, JSON.stringify(configToSave));
    localStorage.setItem(`klynn_ecf_cfg_${config.tenant_id}`, JSON.stringify(configToSave));
  }

  if (typeof window !== "undefined" && !navigator.onLine) return;

  const existing = await getECFConfig(realId);
  const payload = {
    ...configToSave,
    id: existing?.id || configToSave.id || crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  };
  try {
    await supabase.from("ecf_config").upsert(payload);
  } catch {}
}

export async function getECFSequences(tenantId: string): Promise<ECFSequence[]> {
  const realId = resolveTenantId(tenantId);
  const cacheKey = `klynn_ecf_seqs_${realId}`;
  if (typeof window !== "undefined" && !navigator.onLine) {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${tenantId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return [];
  }

  try {
    const filter =
      realId !== tenantId
        ? `tenant_id.eq.${realId},tenant_id.eq.${tenantId}`
        : `tenant_id.eq.${realId}`;

    const fetchPromise = supabase.from("ecf_sequences").select("*").or(filter).order("tipo_ecf");

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {
    console.warn("Aviso al obtener secuencias:", e);
  }

  if (typeof window !== "undefined") {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${tenantId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return [];
}

export async function saveECFSequence(seq: ECFSequence) {
  const realId = resolveTenantId(seq.tenant_id);
  const seqToSave = { ...seq, tenant_id: realId };
  const cacheKey = `klynn_ecf_seqs_${realId}`;
  if (typeof window !== "undefined") {
    let localSeqs: ECFSequence[] = [];
    try {
      const raw =
        localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${seq.tenant_id}`);
      if (raw) localSeqs = JSON.parse(raw);
    } catch {}
    const idx = localSeqs.findIndex(
      (s) => s.id === seqToSave.id || s.tipo_ecf === seqToSave.tipo_ecf,
    );
    if (idx >= 0) localSeqs[idx] = seqToSave;
    else localSeqs.push(seqToSave);
    localStorage.setItem(cacheKey, JSON.stringify(localSeqs));
    localStorage.setItem(`klynn_ecf_seqs_${seq.tenant_id}`, JSON.stringify(localSeqs));
  }

  try {
    const { error } = await supabase.from("ecf_sequences").upsert(seqToSave);
    if (error) {
      console.warn("Aviso al guardar secuencia e-CF en Supabase:", error);
    }
  } catch (e) {
    console.warn("Error guardando secuencia e-CF:", e);
  }
}

export async function deleteECFSequence(id: string, tenantId?: string) {
  const realId = tenantId ? resolveTenantId(tenantId) : undefined;
  if (realId && typeof window !== "undefined") {
    const cacheKey = `klynn_ecf_seqs_${realId}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const localSeqs: ECFSequence[] = JSON.parse(raw);
        const filtered = localSeqs.filter((s) => s.id !== id);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
        if (tenantId) localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(filtered));
      }
    } catch {}
  }

  try {
    const { error } = await supabase.from("ecf_sequences").delete().eq("id", id);
    if (error) console.warn("Aviso al eliminar secuencia:", error);
  } catch {}
}

export async function getECFDocuments(tenantId: string): Promise<ECFDocument[]> {
  if (typeof window !== "undefined" && !navigator.onLine) return [];
  try {
    const fetchPromise = supabase
      .from("ecf_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("fecha_emision", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 1500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (error || !data) return [];
    return (data || []).map((doc: any) => ({
      ...doc,
      pdf_url: doc.pdf_url || doc.dgii_response?.pdf || doc.dgii_response?.pdf_url,
      xml_url: doc.xml_url || doc.dgii_response?.xmlUrl || doc.dgii_response?.xml_url,
      document_stamp_url:
        doc.document_stamp_url || doc.dgii_response?.documentStampUrl || doc.qr_content,
      security_code: doc.security_code || doc.dgii_response?.securityCode,
      contingency_mode: doc.contingency_mode ?? doc.dgii_response?.contingencyMode ?? false,
      legal_status: doc.legal_status || doc.dgii_response?.legalStatus,
      pronesoft_id: doc.pronesoft_id || doc.dgii_response?.id,
    }));
  } catch {
    return [];
  }
}

export async function saveECFDocument(doc: ECFDocument) {
  const cleanDoc: Record<string, any> = {
    id: doc.id,
    tenant_id: doc.tenant_id,
    order_id: doc.order_id || null,
    encf: doc.encf,
    tipo_ecf: doc.tipo_ecf,
    rnc_receptor: doc.rnc_receptor || null,
    track_id: doc.track_id || null,
    status: doc.status || "pending",
    dgii_response: doc.dgii_response || {
      pdf_url: (doc as any).pdf_url,
      xml_url: (doc as any).xml_url,
      document_stamp_url: (doc as any).document_stamp_url,
      security_code: (doc as any).security_code,
      contingency_mode: (doc as any).contingency_mode,
      stamp_date: (doc as any).stamp_date,
      signature_date: (doc as any).signature_date,
      legal_status: (doc as any).legal_status,
      pronesoft_id: (doc as any).pronesoft_id,
    },
    xml_content:
      doc.xml_content || (doc as any).xml_url || (doc.dgii_response as any)?.xmlUrl || "",
    qr_content: doc.qr_content || (doc as any).document_stamp_url || null,
    monto_total: doc.monto_total ?? 0,
    monto_itbis: doc.monto_itbis ?? 0,
    fecha_emision: doc.fecha_emision || new Date().toISOString(),
  };

  if (typeof window !== "undefined" && !navigator.onLine) return;

  try {
    const { error } = await supabase.from("ecf_documents").upsert(cleanDoc);
    if (error && error.code === "23503" && cleanDoc.order_id) {
      cleanDoc.order_id = null;
      await supabase.from("ecf_documents").upsert(cleanDoc);
    }
  } catch (err) {}
}

export async function nextECFNumero(
  tenantId: string,
  tipo: string,
): Promise<{ ncf: string; expiration_date?: string }> {
  const realId = resolveTenantId(tenantId);
  const normalizedTipo = tipo.startsWith("E") || tipo.startsWith("B") ? tipo : `E${tipo}`;

  const padLen = normalizedTipo.startsWith("E") ? 10 : 8;
  const cacheKey = `klynn_ecf_seqs_${realId}`;

  // 1. Obtener el número máximo YA UTILIZADO en órdenes locales existentes
  let maxOrderNum = 0;
  try {
    const localOrders = read<Orden[]>(KEY.ordenes, []);
    for (const o of localOrders) {
      if (o.ncf && o.ncf.startsWith(normalizedTipo)) {
        const numPart = parseInt(o.ncf.slice(normalizedTipo.length), 10);
        if (!isNaN(numPart) && numPart > maxOrderNum) {
          maxOrderNum = numPart;
        }
      }
    }
  } catch {}

  // 2. Obtener secuencias locales en caché
  let localSeqs: any[] = [];
  if (typeof window !== "undefined") {
    const raw =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${tenantId}`);
    if (raw) {
      try {
        localSeqs = JSON.parse(raw);
      } catch {}
    }
  }

  // Encontrar la secuencia para este tipo
  const seqIndex = localSeqs.findIndex(
    (s) =>
      (s.tipo_ecf === normalizedTipo || s.tipo === normalizedTipo) &&
      s.is_active !== false &&
      s.activa !== false,
  );

  const seq = seqIndex >= 0 ? localSeqs[seqIndex] : null;
  const currentSeqVal = seq ? (seq.valor_actual ?? seq.secuencia_actual ?? 0) : 0;
  const initialSeqVal = seq ? (seq.valor_inicial ?? seq.secuencia_desde ?? 1) : 1;
  const localCounter = read<number>(`klynn_ecf_sec_${realId}_${normalizedTipo}`, 0);

  // El siguiente número DEBE ser mayor al máximo de TODAS las fuentes
  const baseNum = Math.max(currentSeqVal, maxOrderNum, localCounter, initialSeqVal - 1);
  const proximo = baseNum + 1;

  // Actualizar inmediatamente todas las fuentes locales (0ms)
  if (seqIndex >= 0) {
    localSeqs[seqIndex].valor_actual = proximo;
    localSeqs[seqIndex].secuencia_actual = proximo;
  } else {
    localSeqs.push({
      id: uid("seq"),
      tenant_id: realId,
      tipo_ecf: normalizedTipo,
      valor_inicial: 1,
      valor_final: 99999999,
      valor_actual: proximo,
      secuencia_actual: proximo,
      is_active: true,
      activa: true,
    });
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(cacheKey, JSON.stringify(localSeqs));
    localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(localSeqs));
  }
  write(`klynn_ecf_sec_${realId}_${normalizedTipo}`, proximo);
  write(`klynn_ecf_sec_${tenantId}_${normalizedTipo}`, proximo);

  const encf = `${normalizedTipo}${String(proximo).padStart(padLen, "0")}`;

  // Si estamos online, intentar actualizar Supabase en segundo plano
  if (typeof window === "undefined" || navigator.onLine) {
    if (seq?.id && !isNaN(Number(seq.id))) {
      supabase
        .from("ecf_sequences")
        .update({ valor_actual: proximo, secuencia_actual: proximo })
        .eq("id", Number(seq.id))
        .then();
    }
  }

  return { ncf: encf, expiration_date: seq?.fecha_vencimiento };
}

import { getProneSoftClient } from "./fiscal/pronesoft-client";

export async function getECFDocumentosRecibidos(tenantId: string): Promise<ECFDocumentRecibido[]> {
  try {
    // 1. Obtener la config fiscal para saber si tiene pronesoft_tenant_id y está activo
    const { data: config } = await supabase
      .from("ecf_config")
      .select(
        "is_active, pronesoft_tenant_id, ambiente, pronesoft_environment, usar_credenciales_propias, pronesoft_client_id, pronesoft_client_secret",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const isUUID =
      config?.pronesoft_tenant_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.pronesoft_tenant_id,
      );

    if (config?.is_active && isUUID) {
      const pronesoft = getProneSoftClient(
        config.pronesoft_tenant_id,
        config.pronesoft_environment === "CerteCF"
          ? "homologacion"
          : config.pronesoft_environment === "eCF" || config.ambiente === "produccion"
            ? "production"
            : "sandbox",
        config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
        config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
        tenantId,
      );
      const res = await pronesoft.listReceivedDocuments(1, 100);

      // Si hay datos, upsertarlos en la base de datos local
      if (res && res.data && res.data.length > 0) {
        const ops = res.data.map((doc: any) => ({
          tenant_id: tenantId,
          id: doc.id || doc.trackId || doc.eNcf || doc.encf,
          tipo_ecf:
            doc.documentType ||
            (doc.eNcf ? doc.eNcf.substring(0, 3) : doc.encf ? doc.encf.substring(0, 3) : "E31"),
          rnc_emisor: doc.issuerRnc || doc.sellerRnc || "N/A",
          nombre_emisor: doc.issuerName || doc.sellerName || "Proveedor",
          encf: doc.eNcf || doc.encf || "",
          monto_total: doc.totalAmount || doc.totals?.totalAmount || 0,
          monto_itbis: doc.totalItbis || doc.totals?.totalITBIS || 0,
          estado_comercial:
            doc.commercialStatus === "ACCEPTED" || doc.commercialStatus === "APROBADO"
              ? "APROBADO"
              : doc.commercialStatus === "REJECTED" || doc.commercialStatus === "RECHAZADO"
                ? "RECHAZADO"
                : "PENDIENTE",
          pdf_url: doc.pdfUrl || doc.fileUrl || null,
          creado_en: doc.receivedAt || doc.issueDate || doc.createdAt || new Date().toISOString(),
        }));

        // Guardamos los documentos en batch si no existen
        for (const op of ops) {
          await supabase.from("ecf_documentos_recibidos").upsert(op, { onConflict: "id" });
        }
      }
    }
  } catch (error) {
    console.warn("Aviso al sincronizar facturas recibidas con Pronesoft:", error);
  }

  // 2. Obtener de la base de datos local
  const { data, error } = await supabase
    .from("ecf_documentos_recibidos")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("creado_en", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function saveECFDocumentoRecibido(doc: Partial<ECFDocumentRecibido>) {
  const { data, error } = await supabase
    .from("ecf_documentos_recibidos")
    .upsert(doc)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEstadoComercialECF(
  id: string,
  estado: "APROBADO" | "RECHAZADO",
  tenantId?: string,
) {
  // Primero notificar al SDK si hay tenantId
  if (tenantId) {
    try {
      const config = await getECFConfig(tenantId);
      if (config?.is_active) {
        const pronesoft = getProneSoftClient(
          config.pronesoft_tenant_id,
          config.pronesoft_environment === "CerteCF"
            ? "homologacion"
            : config.pronesoft_environment === "eCF" || config.ambiente === "produccion"
              ? "production"
              : "sandbox",
          config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
          config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined,
          tenantId,
        );
        await pronesoft.submitCommercialApproval(
          id,
          estado === "APROBADO" ? "ACCEPTED" : "REJECTED",
        );
      }
    } catch (err) {
      console.warn("Aviso al enviar aprobación comercial a Pronesoft:", err);
    }
  }

  const { error } = await supabase
    .from("ecf_documentos_recibidos")
    .update({ estado_comercial: estado })
    .eq("id", id);

  if (error) throw error;
}

export async function updateECFConfig(tenantId: string, updates: Partial<ECFConfig>) {
  if (updates.pronesoft_environment || updates.ambiente) {
    try {
      const { error: rpcError } = await supabase.rpc("admin_update_ecf_environment", {
        p_tenant_id: tenantId,
        p_environment: updates.pronesoft_environment || "TesteCF",
        p_ambiente: updates.ambiente || (updates.pronesoft_environment === "eCF" ? "produccion" : "pruebas"),
      });
      if (!rpcError) {
        const otherUpdates = { ...updates };
        delete otherUpdates.pronesoft_environment;
        delete otherUpdates.ambiente;
        if (Object.keys(otherUpdates).length > 0) {
          await supabase.from("ecf_config").update(otherUpdates).eq("tenant_id", tenantId);
        }
        return;
      }
    } catch (e) {
      console.warn("Aviso al ejecutar admin_update_ecf_environment RPC:", e);
    }
  }

  const { error } = await supabase.from("ecf_config").update(updates).eq("tenant_id", tenantId);
  if (error) throw error;
}

export async function validarLicenciaConNube(
  codigo: string,
): Promise<{ ok: boolean; licencia?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("licencias_locales")
      .select("*")
      .eq("codigo", codigo)
      .eq("estado", "ACTIVO")
      .single();

    if (error) {
      return { ok: false, error: "Código de licencia no encontrado o inactivo." };
    }

    await supabase.rpc("marcar_licencia_sincronizada", { p_codigo: codigo });

    return { ok: true, licencia: data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error de conexión con el servidor." };
  }
}

export interface Notificacion {
  id: string;
  tenant_id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  link: string | null;
  created_at: string;
}

export async function getNotificaciones(tenantId: string): Promise<Notificacion[]> {
  if (typeof window !== "undefined" && !navigator.onLine) return [];
  try {
    const fetchPromise = supabase
      .from("notificaciones")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);

    const timeoutPromise = new Promise<{ data: any }>((resolve) =>
      setTimeout(() => resolve({ data: [] }), 1500),
    );

    const { data } = await Promise.race([fetchPromise, timeoutPromise]);
    return data || [];
  } catch {
    return [];
  }
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
}

export async function marcarTodasNotificacionesLeidas(tenantId: string): Promise<void> {
  await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("tenant_id", tenantId)
    .eq("leida", false);
}

export async function crearNotificacion(notif: {
  tenant_id: string;
  titulo: string;
  mensaje: string;
  tipo?: string;
  leida?: boolean;
  link?: string | null;
}): Promise<void> {
  const newNotif = {
    id: uid("notif"),
    tenant_id: notif.tenant_id,
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    tipo: notif.tipo || "INFO",
    leida: notif.leida || false,
    link: notif.link || null,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar en Base de Datos Supabase
  try {
    await supabase.from("notificaciones").insert(newNotif);
  } catch (e) {
    console.warn("Error guardando notificación en DB:", e);
  }

  // 2. Transmisión entre pestañas del mismo navegador (Instantáneo con cero latencia)
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(`klynn_tenant_${notif.tenant_id}`);
      bc.postMessage({ type: "NUEVA_NOTIFICACION", notificacion: newNotif });
      bc.close();
    }
  } catch (e) {
    console.warn("BroadcastChannel error:", e);
  }

  // 3. Supabase Realtime Broadcast (Transmisión instantánea entre diferentes dispositivos / teléfonos / PCs)
  try {
    const channel = supabase.channel(`tenant_events_${notif.tenant_id}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel
          .send({
            type: "broadcast",
            event: "nueva_notificacion",
            payload: newNotif,
          })
          .then(() => {
            setTimeout(() => {
              supabase.removeChannel(channel);
            }, 1000);
          });
      }
    });
  } catch (e) {
    console.warn("Supabase Realtime Broadcast error:", e);
  }
}

// ============ Invitaciones y Códigos VIP de Registro ============

export function generateInvitationCode(): string {
  // Formato: KLYNN-XXXXXXXX (8 caracteres alfanuméricos en mayúsculas, ej: KLYNN-7X4M9P2K)
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KLYNN-${randomPart}`;
}

export async function getInvitaciones(): Promise<InvitacionCodigo[]> {
  try {
    const { data, error } = await supabase
      .from("invitaciones")
      .select("*")
      .order("creado_en", { ascending: false });
    if (!error && data) {
      const now = new Date();
      const updated = data.map((inv: any) => {
        if (inv.estado === "DISPONIBLE" && inv.expira_en && new Date(inv.expira_en) < now) {
          return { ...inv, estado: "EXPIRADO" as const };
        }
        return inv as InvitacionCodigo;
      });
      write(KEY.invitaciones, updated);
      return updated;
    }
  } catch (e) {
    console.warn("getInvitaciones Supabase fallback to local:", e);
  }

  const local = read<InvitacionCodigo[]>(KEY.invitaciones, []) || [];
  const now = new Date();
  return local.map((inv) => {
    if (inv.estado === "DISPONIBLE" && inv.expira_en && new Date(inv.expira_en) < now) {
      return { ...inv, estado: "EXPIRADO" };
    }
    return inv;
  });
}

export async function createInvitacion(data: {
  nota?: string;
  plan_id?: PlanId;
  expira_horas?: number | null;
  dias_trial?: number;
}): Promise<InvitacionCodigo> {
  const all = await getInvitaciones();
  let code = generateInvitationCode();
  let attempts = 0;
  while (all.some((x) => x.codigo === code) && attempts < 50) {
    code = generateInvitationCode();
    attempts++;
  }

  let expira_en: string | null = null;
  if (data.expira_horas && data.expira_horas > 0) {
    const d = new Date();
    d.setHours(d.getHours() + data.expira_horas);
    expira_en = d.toISOString();
  }

  const nueva: InvitacionCodigo = {
    id: uid("inv"),
    codigo: code,
    nota: data.nota?.trim() || "",
    plan_id: data.plan_id || "pro",
    dias_trial: data.dias_trial || 14,
    estado: "DISPONIBLE",
    creado_en: new Date().toISOString(),
    expira_en,
    usado_en: null,
    usado_por_slug: null,
    usado_por_email: null,
  };

  try {
    const { error } = await supabase.from("invitaciones").insert(nueva);
    if (error) {
      console.warn("Supabase 'invitaciones' table insert warning (fallback local):", error.message);
    }
  } catch (e) {
    console.warn("createInvitacion Supabase error:", e);
  }

  const list = [nueva, ...all.filter((x) => x.id !== nueva.id)];
  write(KEY.invitaciones, list);
  return nueva;
}

export async function validarCodigoInvitacion(codigoRaw: string): Promise<{
  ok: boolean;
  error?: string;
  invitacion?: InvitacionCodigo;
}> {
  if (!codigoRaw || !codigoRaw.trim()) {
    return { ok: false, error: "Ingresa un código de activación." };
  }

  const clean = codigoRaw
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  const all = await getInvitaciones();
  const found = all.find((x) => {
    const storedClean = x.codigo.toUpperCase().replace(/[^0-9A-Z]/g, "");
    return (
      x.codigo.toUpperCase() === codigoRaw.trim().toUpperCase() ||
      storedClean === clean ||
      storedClean.endsWith(clean) ||
      clean.endsWith(storedClean)
    );
  });

  if (!found) {
    return { ok: false, error: "El código de activación ingresado no existe o no es válido." };
  }

  if (found.estado === "USADO") {
    return { ok: false, error: "Este código de activación ya fue utilizado." };
  }

  if (found.expira_en && new Date(found.expira_en) < new Date()) {
    return { ok: false, error: "Este código de activación ha expirado." };
  }

  return { ok: true, invitacion: found };
}

export async function marcarCodigoUsado(
  codigoRaw: string,
  tenantSlug: string,
  email: string,
): Promise<boolean> {
  const clean = codigoRaw
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  const all = await getInvitaciones();
  const found = all.find((x) => {
    const storedClean = x.codigo.toUpperCase().replace(/[^0-9A-Z]/g, "");
    return (
      x.codigo.toUpperCase() === codigoRaw.trim().toUpperCase() ||
      storedClean === clean ||
      storedClean.endsWith(clean) ||
      clean.endsWith(storedClean)
    );
  });
  if (!found) return false;

  const updated: InvitacionCodigo = {
    ...found,
    estado: "USADO",
    usado_en: new Date().toISOString(),
    usado_por_slug: tenantSlug,
    usado_por_email: email,
  };

  try {
    await supabase
      .from("invitaciones")
      .update({
        estado: "USADO",
        usado_en: updated.usado_en,
        usado_por_slug: tenantSlug,
        usado_por_email: email,
      })
      .eq("id", found.id);
  } catch (e) {
    console.warn("marcarCodigoUsado Supabase error:", e);
  }

  const list = all.map((x) => (x.id === found.id ? updated : x));
  write(KEY.invitaciones, list);
  return true;
}

export async function deleteInvitacion(id: string): Promise<boolean> {
  try {
    await supabase.from("invitaciones").delete().eq("id", id);
  } catch (e) {
    console.warn("deleteInvitacion error in Supabase:", e);
  }
  const all = await getInvitaciones();
  const filtered = all.filter((x) => x.id !== id);
  write(KEY.invitaciones, filtered);
  return true;
}

export interface MetaServicio {
  id?: string;
  tenant_id: string;
  servicio_nombre: string;
  meta_diaria: number;
  activo: boolean;
}

export async function getMetasServicios(
  tenantId: string,
): Promise<Record<string, { meta_diaria: number; activo: boolean }>> {
  if (!tenantId || tenantId === "__loading__") return {};
  try {
    const tenant = await getTenantById(tenantId);
    return (tenant?.config as any)?.metas_servicios || {};
  } catch {
    return {};
  }
}

export async function saveMetaServicio(
  tenantId: string,
  servicioNombre: string,
  metaDiaria: number,
  activo: boolean = true,
): Promise<void> {
  if (!tenantId || tenantId === "__loading__") return;
  try {
    const tenant = await getTenantById(tenantId);
    if (tenant) {
      const current = (tenant.config as any)?.metas_servicios || {};
      current[servicioNombre] = { meta_diaria: metaDiaria, activo };
      await saveTenant({
        ...tenant,
        config: { ...tenant.config, metas_servicios: current },
      });
    }
  } catch (e) {
    console.warn("Error guardando meta en tenant.config:", e);
  }
}
