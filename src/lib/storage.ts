import { supabase } from "./supabase";
import { createClient } from "@supabase/supabase-js";

export const IS_LOCAL_MODE = import.meta.env.VITE_APP_MODE === "local";

export type PlanId = "basico" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null;
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
    multisucursal: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
  };
  destacado?: boolean;
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
}

export interface GlobalConfig {
  requirePlanOnRegistration: boolean;
  trialDays: number;
  defaultPlanId: PlanId;
  bankDetails?: BankDetails;
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
}

export interface TenantConfig {
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

  // Alertas de Secuencias NCF/e-CF
  alerta_ncf_limite?: number;
  alerta_ncf_telefono?: string;
  max_sucursales?: number;
  pos_habilitar_servicios?: boolean;
  pos_habilitar_prendas?: boolean;
  pos_modal_desglose?: boolean;
  pos_modo_defecto?: boolean;
  pos_auto_imprimir?: boolean;
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
  };
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
  instance: string; // nombre de instancia WapiSender
  base_url?: string; // por defecto https://wasenderapi.com
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

export interface OrdenItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  es_libra?: boolean;
  is_exento?: boolean;
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
  // Metadatos e-CF para el ticket
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
  ambiente: "pruebas" | "produccion";
  is_active: boolean;
  api_auth_token?: string;
  api_token_expires_at?: string;
  // Pronesoft multi-empresa
  pronesoft_tenant_id?: string; // x-tenant-id (UUID asignado por Pronesoft a este negocio)
  usar_credenciales_propias?: boolean;
  pronesoft_client_id?: string;
  pronesoft_client_secret?: string;
  updated_at: string;
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
  is_exento?: boolean;
  es_muestra?: boolean;
  permitir_desglose?: boolean;
  permitir_editar_precio?: boolean;
}

const KEY = {
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
};

export const ADMIN_EMAILS = ["admin@klynn.com.do"];

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null;
  limite_whatsapp_mes: number; // Nuevo límite
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
    multisucursal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
  };
  destacado?: boolean;
  polar_product_monthly_url?: string;
  polar_product_yearly_url?: string;
  precio_sucursal_adicional?: number;
  polar_sucursal_url?: string;
  limite_sucursales_adicionales?: number;
}

export const PLANS: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio_mensual: 1300,
    precio_anual: 12000,
    limite_empleados: 2,
    limite_ordenes_mes: 300,
    limite_whatsapp_mes: 300,
    modulos: { whatsapp: true, facturacion_fiscal: false, multisucursal: true, logistica: false, procesos: true, estanteria: true },
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
    modulos: { whatsapp: true, facturacion_fiscal: false, multisucursal: true, logistica: true, procesos: true, estanteria: true },
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
    modulos: { whatsapp: true, facturacion_fiscal: true, multisucursal: true, logistica: true, procesos: true, estanteria: true },
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

export function isModuleEnabled(
  tenant: Tenant | null,
  moduleKey: "whatsapp" | "facturacion_fiscal" | "multisucursal" | "logistica" | "procesos" | "estanteria",
  plan?: Plan,
): boolean {
  if (!tenant || tenant.id === "__loading__") return true;

  // 1. Check if there is an override in tenant.config.modulos_override
  const override = tenant.config?.modulos_override?.[moduleKey];
  if (override !== undefined) {
    return !!override;
  }

  // 2. Fallback to plan
  const activePlan = plan || getTenantPlan(tenant);
  if (moduleKey === "estanteria") {
    return activePlan?.modulos?.estanteria !== false;
  }
  return !!activePlan?.modulos?.[moduleKey];
}

export const DEFAULT_CONFIG: TenantConfig = {
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
      "Hola 👋, {cliente} ✨, tu orden {numero} de {detalle} en {lavanderia} ya está LISTA para retirar. ¡Te esperamos!",
    plantilla_entregada:
      "Hola 👋, {cliente}, tu orden {numero} fue entregada. ¡Gracias por preferir {lavanderia}!",
    plantilla_sin_retirar:
      "Hola 👋, {cliente}. Te recordamos que tu orden {numero} ({detalle}) lleva {dias} días lista en {lavanderia}. Saldo pendiente: {saldo}. ¡Pasa a retirarla cuando gustes en {lavanderia_dir}!",
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
    descripcion: "Control de producción y etapas de lavado",
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
function read<T>(k: string, f: T): T {
  if (!isBrowser()) return f;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : f;
  } catch {
    return f;
  }
}
function write<T>(k: string, v: T) {
  if (isBrowser()) localStorage.setItem(k, JSON.stringify(v));
}

// ============ Plans ============

export async function getPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await supabase.from("planes").select("*").order("precio_mensual");
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
            whatsapp: !!p.whatsapp,
            facturacion_fiscal: !!p.facturacion_fiscal,
            multisucursal: !!p.multisucursal,
            logistica: !!p.logistica,
            procesos: p.procesos !== undefined && p.procesos !== null
              ? !!p.procesos
              : (staticMatch?.modulos?.procesos ?? true),
            estanteria: p.estanteria !== undefined && p.estanteria !== null
              ? !!p.estanteria
              : (staticMatch?.modulos?.estanteria ?? true),
          },
          limite_whatsapp_mes: p.limite_whatsapp_mes ?? 0,
          destacado: !!p.destacado,
          polar_product_monthly_url: p.polar_product_monthly_url,
          polar_product_yearly_url: p.polar_product_yearly_url,
          precio_sucursal_adicional:
            p.precio_sucursal_adicional !== undefined
              ? p.precio_sucursal_adicional
              : staticMatch?.precio_sucursal_adicional || 0,
          polar_sucursal_url:
            p.polar_sucursal_url !== undefined
              ? p.polar_sucursal_url
              : staticMatch?.polar_sucursal_url || "",
          limite_sucursales_adicionales:
            p.limite_sucursales_adicionales !== undefined
              ? p.limite_sucursales_adicionales
              : staticMatch?.limite_sucursales_adicionales || 0,
        };
      });
      _cachedPlans = mapped;
      return mapped;
    }
  } catch (e) {
    console.error("Error fetching plans from Supabase:", e);
  }

  const s = read<Plan[] | null>(KEY.plans, null);
  if (!Array.isArray(s) || s.length === 0) return PLANS;
  return s;
}
export function savePlans(plans: Plan[]) {
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
  const { error } = await supabase.from("tenants").upsert(t);
  if (error) throw error;
}

export async function saveTenantConfig(tenantId: string, config: TenantConfig) {
  const { error } = await supabase.from("tenants").update({ config }).eq("id", tenantId);
  if (error) throw error;
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

  // 2. Guardar la lavandería
  const { error: tenantError } = await supabase.from("tenants").insert(tenant);
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

  return { tenant, user: authData.user };
}

export async function registerBranch(tenant: Tenant, admin: Empleado, userId: string) {
  // 1. Guardar la lavandería
  const { error: tenantError } = await supabase.from("tenants").insert(tenant);
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

  return { tenant };
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
    console.error("Error al limpiar archivos de Storage:", e);
  }

  // 2. Limpiar Usuarios en Auth (Vía RPC de Admin)
  try {
    const emps = await getEmpleados(id);
    for (const emp of emps) {
      try {
        await supabase.rpc("admin_delete_user", { target_user_id: emp.id });
      } catch (errAuth) {
        console.warn(`No se pudo eliminar auth user ${emp.id}:`, errAuth);
      }
    }
    console.log(`Usuarios de Auth para lavandería ${id} procesados.`);
  } catch (e) {
    console.error("Error al limpiar usuarios de Auth:", e);
  }

  // 3. Limpiar manualmente tablas relacionadas para evitar bloqueos por Foreign Key
  const relatedTables = [
    "mensajes",
    "conversations",
    "movimientos_caja",
    "caja_turnos",
    "gastos",
    "orden_items",
    "ordenes",
    "clientes",
    "prendas",
    "servicios",
    "sucursales",
    "empleados",
    "notificaciones",
    "auditoria",
    "configuracion",
    "ecf_configs"
  ];

  for (const table of relatedTables) {
    try {
      await supabase.from(table).delete().eq("tenant_id", id);
    } catch (_tblErr) {
      // Ignorar si la tabla no existe o no tiene tenant_id
    }
  }

  // 4. Eliminar la lavandería de la tabla tenants
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar tenant de la tabla tenants:", error);
    throw error;
  }

  console.log(`[deleteTenant] Lavandería ${id} eliminada por completo.`);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .single();
  if (error) return undefined;
  return data;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const { data, error } = await supabase.from("tenants").select("*").eq("id", id).single();
  if (error) return undefined;
  return data;
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
  // Update Tenant Email
  await supabase.from("tenants").update({ email: newEmail }).eq("id", tenant_id);

  // Update Admin Employee
  const emps = await getEmpleados(tenant_id);
  const admin = emps.find((e) => e.rol === "ADMIN");
  if (admin) {
    const updates: Partial<Empleado> = { email: newEmail };

    // Actualizar el email en Supabase Auth mediante la función RPC segura
    await supabase.rpc("admin_set_user_email", {
      target_user_id: admin.id,
      new_email: newEmail,
    });

    if (newPassword) {
      updates.password = "***"; // No guardamos texto plano
      // Actualizar en Auth mediante la función RPC segura
      await supabase.rpc("admin_set_user_password", {
        target_user_id: admin.id,
        new_password: newPassword,
      });
    }
    await supabase.from("empleados").update(updates).eq("id", admin.id);
  }
}

export async function updateTenantPlan(tenantId: string, planId: PlanId, resetStartDate = false) {
  const updates: any = { plan_id: planId };
  if (resetStartDate) {
    updates.plan_fecha_inicio = new Date().toISOString();
  }
  const { error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", tenantId);
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
  overrides: TenantConfig["modulos_override"],
  mesesPagadosOverride?: number
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
  const nextConfig = {
    ...currentConfig,
    modulos_override: overrides,
    meses_pagados_override: mesesPagadosOverride !== undefined ? mesesPagadosOverride : currentConfig.meses_pagados_override,
  };

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
};

export async function getGlobalConfig(): Promise<GlobalConfig> {
  try {
    const { data, error } = await supabase
      .from("global_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      return {
        requirePlanOnRegistration:
          data.require_plan_on_registration ??
          data.requirePlanOnRegistration ??
          DEFAULT_GLOBAL_CONFIG.requirePlanOnRegistration,
        trialDays: data.trial_days ?? data.trialDays ?? DEFAULT_GLOBAL_CONFIG.trialDays,
        defaultPlanId:
          data.default_plan_id ?? data.defaultPlanId ?? DEFAULT_GLOBAL_CONFIG.defaultPlanId,
        bankDetails: data.bank_details ?? data.bankDetails,
      };
    }
  } catch (e) {
    console.error("Error fetching global config:", e);
  }
  return read<GlobalConfig>(KEY.globalConfig, DEFAULT_GLOBAL_CONFIG);
}

export async function saveGlobalConfig(config: GlobalConfig) {
  try {
    const { error } = await supabase.from("global_config").upsert({
      id: 1,
      require_plan_on_registration: config.requirePlanOnRegistration,
      trial_days: config.trialDays,
      default_plan_id: config.defaultPlanId,
      bank_details: config.bankDetails,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("Error saving global config to Supabase:", error);
  } catch (e) {
    console.error("Error saving global config:", e);
  }
  write(KEY.globalConfig, config);
}

// ============ Empleados (Supabase) ============
export async function getEmpleados(tenant_id?: string): Promise<Empleado[]> {
  let query = supabase.from("empleados").select("*");
  if (tenant_id) query = query.eq("tenant_id", tenant_id);
  const { data, error } = await query.order("nombre");
  if (error) {
    console.error("Error getEmpleados:", error);
    return [];
  }
  return data || [];
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
          // El usuario ya existe en Auth. Sincronizamos con su ID de la tabla empleados
          const { data: existingByEmail } = await supabase
            .from("empleados")
            .select("id")
            .eq("email", emailLower)
            .maybeSingle();

          if (existingByEmail) {
            console.log(
              "El usuario ya existe en Auth y public.empleados. Usando ID existente:",
              existingByEmail.id,
            );
            e.id = existingByEmail.id;

            // Si especificó contraseña, actualizarla
            if (e.password && e.password !== "***") {
              await supabase.rpc("admin_set_user_password", {
                target_user_id: e.id,
                new_password: e.password,
              });
            }
          } else {
            throw new Error(
              `El correo "${emailLower}" ya está registrado en el sistema. Por favor utiliza un correo electrónico diferente.`,
            );
          }
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
    if (e.password && e.password.length >= 6 && e.password !== "***") {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        // Caso especial: El admin se actualiza a sí mismo
        if (currentUser && currentUser.id === e.id) {
          console.log("Auto-actualización de contraseña...");
          const { error: updateError } = await supabase.auth.updateUser({ password: e.password });
          if (updateError) authErrorMsg = "Error auto-update: " + updateError.message;

          if (currentUser.email !== emailLower) {
            console.log("Auto-actualización de email...");
            const { error: emailError } = await supabase.auth.updateUser({ email: emailLower });
            if (emailError)
              authErrorMsg =
                (authErrorMsg ? authErrorMsg + " " : "") +
                "Error auto-update email: " +
                emailError.message;
          }
        } else if (e.id && e.id.length === 36) {
          // Actualizar usuario existente que ya tiene ID de Auth (UUID)
          console.log("Actualizando contraseña/correo de usuario UUID en Auth via RPC...");
          const { error: rpcError } = await supabase.rpc("admin_set_user_password", {
            target_user_id: e.id,
            new_password: e.password,
          });
          if (rpcError) {
            console.error("RPC ERROR:", rpcError);
          }

          const { error: emailRpcError } = await supabase.rpc("admin_set_user_email", {
            target_user_id: e.id,
            new_email: emailLower,
          });
          if (emailRpcError) {
            console.error("RPC EMAIL ERROR:", emailRpcError);
          }
        }
      } catch (err: any) {
        console.error("EXCEPCION AUTH:", err);
        authErrorMsg = "Excepción: " + err.message;
      }
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
  // 1. Intentar borrar de Auth primero (vía RPC)
  try {
    await supabase.rpc("admin_delete_user", { target_user_id: id });
  } catch (e) {
    console.warn("No se pudo eliminar el usuario de Auth, procediendo con DB...", e);
  }

  // 2. Borrar de la tabla empleados
  const { error } = await supabase.from("empleados").delete().eq("id", id);
  if (error) throw error;
}

export async function getEmpleadoById(id: string): Promise<Empleado | undefined> {
  const { data, error } = await supabase.from("empleados").select("*").eq("id", id).single();
  if (error) return undefined;
  return data;
}

// ============ Clientes (Supabase) ============
export async function getClientes(tenant_id: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("nombre");
  if (error) {
    console.error("Error getClientes:", error);
    return [];
  }
  return data || [];
}

export async function saveCliente(c: Cliente) {
  try {
    const { error } = await supabase.from("clientes").upsert(c);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: saving cliente locally", err);
    const local = read<Cliente[]>(KEY.clientes, []);
    const exists = local.findIndex((x) => x.id === c.id);
    if (exists >= 0) local[exists] = c;
    else local.push(c);
    write(KEY.clientes, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

export async function getClienteById(id: string): Promise<Cliente | undefined> {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).single();
  if (error) return undefined;
  return data;
}

// ============ Órdenes (Supabase) ============
export async function getOrdenes(tenant_id: string): Promise<Orden[]> {
  const { data, error } = await supabase
    .from("ordenes")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("creado_en", { ascending: false });
  let results = data || [];

  if (isBrowser()) {
    const local = read<Orden[]>(KEY.ordenes, []).filter((o) => o.tenant_id === tenant_id);
    // Combinar y desduplicar por ID, priorizando local si hay colisión (ya que local podría ser una edición más reciente offline)
    const combined = [...results];
    local.forEach((lo) => {
      if (!combined.some((co) => co.id === lo.id)) {
        combined.push(lo);
      }
    });
    results = combined.sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }

  return results;
}

export async function getOrdenesByPeriod(filters: {
  tenant_id: string;
  empleado_id?: string;
  desde?: string;
  hasta?: string;
}): Promise<Orden[]> {
  let query = supabase.from("ordenes").select("*").eq("tenant_id", filters.tenant_id);

  if (filters.empleado_id && filters.empleado_id !== "all") {
    query = query.eq("empleado_id", filters.empleado_id);
  }

  if (filters.desde) {
    query = query.gte("creado_en", filters.desde);
  }

  if (filters.hasta) {
    query = query.lte("creado_en", filters.hasta + "T23:59:59Z");
  }

  const { data, error } = await query.order("creado_en", { ascending: false });
  if (error) {
    console.error("Error getOrdenesByPeriod:", error);
    return [];
  }
  return data || [];
}

export async function saveOrden(o: Orden) {
  try {
    const { error } = await supabase.from("ordenes").upsert(o);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: saving order locally", err);
    const local = read<Orden[]>(KEY.ordenes, []);
    const exists = local.findIndex((x) => x.id === o.id);
    if (exists >= 0) local[exists] = o;
    else local.push(o);
    write(KEY.ordenes, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function updateOrdenEstado(id: string, estado: EstadoOrden, ubicacion_ropa?: string) {
  const updates: Record<string, any> = { estado };
  if (ubicacion_ropa !== undefined) updates.ubicacion_ropa = ubicacion_ropa;

  // Siempre intentar actualizar localmente por si la orden no se ha sincronizado
  const local = read<Orden[]>(KEY.ordenes, []);
  const idx = local.findIndex((x) => x.id === id);
  let localUpdated = false;
  if (idx >= 0) {
    local[idx].estado = estado;
    if (ubicacion_ropa !== undefined) local[idx].ubicacion_ropa = ubicacion_ropa;
    write(KEY.ordenes, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    localUpdated = true;
  }

  try {
    const { error } = await supabase.from("ordenes").update(updates).eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: updating order estado locally failed", err);
  }
}

export async function getOrdenById(id: string): Promise<Orden | undefined> {
  const { data, error } = await supabase.from("ordenes").select("*").eq("id", id).single();
  if (error) return undefined;
  return data;
}

export async function nextOrdenNumero(tenant_id: string): Promise<string> {
  // Para un sistema robusto, podríamos usar una tabla de secuencias en Supabase
  // Por ahora, buscaremos el número más alto
  const { data, error } = await supabase
    .from("ordenes")
    .select("numero")
    .eq("tenant_id", tenant_id)
    .order("creado_en", { ascending: false })
    .limit(1);

  let next = 1;
  if (!error && data && data.length > 0) {
    const lastNum = data[0].numero;
    const match = lastNum.match(/-(\d+)$/);
    if (match) next = parseInt(match[1]) + 1;
  }

  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `KL-${ym}-${String(next).padStart(4, "0")}`;
}

// ============ Caja (Supabase) ============
export async function getCajas(tenant_id: string): Promise<Caja[]> {
  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("abierta_en", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getHistoricoCierres(filters: {
  tenant_id: string;
  empleado_id?: string;
  desde?: string;
  hasta?: string;
}): Promise<Caja[]> {
  let query = supabase
    .from("cajas")
    .select("*")
    .eq("tenant_id", filters.tenant_id)
    .eq("estado", "CERRADA");

  if (filters.empleado_id && filters.empleado_id !== "all") {
    query = query.eq("empleado_id", filters.empleado_id);
  }

  if (filters.desde) {
    query = query.gte("abierta_en", filters.desde);
  }

  if (filters.hasta) {
    query = query.lte("abierta_en", filters.hasta + "T23:59:59Z");
  }

  const { data, error } = await query.order("cerrada_en", { ascending: false });
  if (error) {
    console.error("Error getHistoricoCierres:", error);
    return [];
  }
  return data || [];
}

export async function getCajaAbierta(tenant_id: string): Promise<Caja | null> {
  if (!tenant_id || tenant_id === "admin") return null;
  try {
    const { data, error } = await supabase
      .from("cajas")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("estado", "ABIERTA")
      .order("abierta_en", { ascending: false });

    if (error) {
      console.error("Error getCajaAbierta:", error);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data[0];
  } catch (e) {
    console.error("Exception in getCajaAbierta:", e);
    return null;
  }
}

export async function saveCaja(c: Caja) {
  const { error } = await supabase.from("cajas").upsert(c);
  if (error) throw error;
}

export async function getMovimientos(
  tenant_id: string,
  caja_id?: string,
): Promise<MovimientoCaja[]> {
  let query = supabase.from("movimientos_caja").select("*").eq("tenant_id", tenant_id);
  if (caja_id) query = query.eq("caja_id", caja_id);
  const { data, error } = await query.order("creado_en", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function saveMovimiento(m: MovimientoCaja) {
  try {
    const { error } = await supabase.from("movimientos_caja").insert(m);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: saving movimiento locally", err);
    const local = read<MovimientoCaja[]>(KEY.movimientos, []);
    if (!local.some((x) => x.id === m.id)) {
      local.push(m);
    }
    write(KEY.movimientos, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

// ============ Gastos (Supabase) ============
export async function getGastos(tenant_id: string): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("fecha", { ascending: false });
  let results = data || [];

  if (isBrowser()) {
    const local = read<Gasto[]>(KEY.gastos, []).filter((g) => g.tenant_id === tenant_id);
    const combined = [...results];
    local.forEach((lg) => {
      if (!combined.some((cg) => cg.id === lg.id)) {
        combined.push(lg);
      }
    });
    results = combined.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
  }

  return results;
}

export async function saveGasto(g: Gasto) {
  try {
    const { error } = await supabase.from("gastos").upsert(g);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: saving gasto locally", err);
    const local = read<Gasto[]>(KEY.gastos, []);
    const exists = local.findIndex((x) => x.id === g.id);
    if (exists >= 0) local[exists] = g;
    else local.push(g);
    write(KEY.gastos, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteGasto(id: string) {
  try {
    await supabase.from("movimientos_caja").delete().eq("referencia", id);
  } catch (e) {
    console.error("Error deleting related movimiento:", e);
  }
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw error;

  if (isBrowser()) {
    const local = read<Gasto[]>(KEY.gastos, []);
    write(
      KEY.gastos,
      local.filter((x) => x.id !== id),
    );
  }
}

// ============ Catálogo (Supabase) ============
export async function getCatalogo(tenant_id: string): Promise<CatalogoItem[]> {
  const { data, error } = await supabase
    .from("catalogo_items")
    .select("*")
    .or(`tenant_id.eq.${tenant_id},tenant_id.eq.admin`)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando catálogo:", error);
    return [];
  }

  // Normaliza tildes/acentos para comparación robusta
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Desduplicar: Si existe una versión del tenant, ocultar la versión 'admin' (global)
  const results: CatalogoItem[] = data || [];
  const finalItems: CatalogoItem[] = [];
  const namesSet = new Set<string>();

  // Primero añadimos los del tenant
  results
    .filter((i) => i.tenant_id !== "admin")
    .forEach((i) => {
      finalItems.push(i);
      namesSet.add(normalize(i.nombre));
    });

  // Luego añadimos los admin solo si no hay uno del tenant con el mismo nombre (normalizado)
  results
    .filter((i) => i.tenant_id === "admin")
    .forEach((i) => {
      if (!namesSet.has(normalize(i.nombre))) {
        finalItems.push(i);
      }
    });

  return finalItems;
}

export async function saveCatalogoItem(item: CatalogoItem) {
  // Guard: never save with an invalid tenant_id
  if (!item.tenant_id || item.tenant_id === "__loading__") {
    console.error("saveCatalogoItem: tenant_id inválido, abortando.", item.tenant_id);
    throw new Error("tenant_id inválido");
  }
  try {
    const { error } = await supabase.from("catalogo_items").upsert(item);
    if (error) throw error;
  } catch (err) {
    console.error("Offline fallback: saving catalog locally", err);
    const local = read<CatalogoItem[]>(KEY.catalogo, []);
    const exists = local.findIndex((x) => x.id === item.id);
    if (exists >= 0) local[exists] = item;
    else local.push(item);
    write(KEY.catalogo, local);
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
  }
}

export async function deleteCatalogoItem(id: string) {
  const { error } = await supabase.from("catalogo_items").delete().eq("id", id);

  if (error) throw error;
}

// ============ Servicios (Supabase) ============
export async function getServicios(tenant_id: string): Promise<Servicio[]> {
  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .or(`tenant_id.eq.${tenant_id},tenant_id.eq.admin`)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando servicios:", error);
    return [];
  }

  // Normaliza tildes/acentos para comparación robusta
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Desduplicar: Priorizar los servicios del propio tenant
  const results: Servicio[] = data || [];
  const finalItems: Servicio[] = [];
  const namesSet = new Set<string>();

  results
    .filter((s) => s.tenant_id !== "admin")
    .forEach((s) => {
      finalItems.push(s);
      namesSet.add(normalize(s.nombre));
    });

  results
    .filter((s) => s.tenant_id === "admin")
    .forEach((s) => {
      if (!namesSet.has(normalize(s.nombre))) {
        finalItems.push(s);
      }
    });

  return finalItems;
}

export async function saveServicio(s: Servicio) {
  // Guard: never save with an invalid tenant_id
  if (!s.tenant_id || s.tenant_id === "__loading__") {
    console.error("saveServicio: tenant_id inválido, abortando.", s.tenant_id);
    throw new Error("tenant_id inválido");
  }
  const { error } = await supabase.from("servicios").upsert(s);

  if (error) throw error;
}

export async function deleteServicio(id: string) {
  const { error } = await supabase.from("servicios").delete().eq("id", id);

  if (error) throw error;
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
      whatsapp: !!p.modulos.whatsapp,
      facturacion_fiscal: !!p.modulos.facturacion_fiscal,
      multisucursal: !!p.modulos.multisucursal,
      logistica: !!p.modulos.logistica,
      procesos: p.modulos.procesos !== undefined ? !!p.modulos.procesos : true,
      estanteria: p.modulos.estanteria !== undefined ? !!p.modulos.estanteria : true,
      limite_whatsapp_mes: p.limite_whatsapp_mes,
      destacado: p.destacado,
      polar_product_monthly_url: p.polar_product_monthly_url,
      polar_product_yearly_url: p.polar_product_yearly_url,
      precio_sucursal_adicional: p.precio_sucursal_adicional,
      polar_sucursal_url: p.polar_sucursal_url,
      limite_sucursales_adicionales: p.limite_sucursales_adicionales,
    });
    if (error) {
      console.warn(
        "Fallo al guardar columnas extendidas en Supabase (posiblemente falta migrar). Reintentando con campos base:",
        error,
      );
      // Fallback: retry without newer columns that may not exist in Supabase yet
      const { error: fallbackError } = await supabase.from("planes").upsert({
        id: p.id,
        nombre: p.nombre,
        precio_mensual: p.precio_mensual,
        precio_anual: p.precio_anual,
        limite_empleados: p.limite_empleados,
        limite_ordenes_mes: p.limite_ordenes_mes,
        whatsapp: !!p.modulos.whatsapp,
        facturacion_fiscal: !!p.modulos.facturacion_fiscal,
        multisucursal: !!p.modulos.multisucursal,
        logistica: !!p.modulos.logistica,
        limite_whatsapp_mes: p.limite_whatsapp_mes,
        destacado: p.destacado,
        polar_product_monthly_url: p.polar_product_monthly_url,
        polar_product_yearly_url: p.polar_product_yearly_url,
      });
      if (fallbackError) {
        console.error("Fallback save also failed:", fallbackError);
      }
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
export function getActiveTenant(): Tenant | undefined {
  if (!isBrowser()) return undefined;
  const slug = localStorage.getItem(KEY.active);
  return slug ? getTenantBySlug(slug) : undefined;
}

export interface Session {
  empleado_id: string;
  tenant_id: string;
  iniciado_en: string;
}
export function getSession(): Session | null {
  return read<Session | null>(KEY.session, null);
}
export function setSession(s: Session | null) {
  if (s) write(KEY.session, s);
  else if (isBrowser()) localStorage.removeItem(KEY.session);
}

export async function login(
  slug: string,
  email: string,
  password: string,
): Promise<{ ok: true; empleado: Empleado; tenant: Tenant } | { ok: false; error: string }> {
  // 1. Verificar el Tenant
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { ok: false, error: "Lavandería no encontrada" };

  // 2. Autenticar en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) return { ok: false, error: "Email o contraseña incorrectos" };
  if (!authData.user) return { ok: false, error: "Error de autenticación" };

  // 3. Obtener el perfil del empleado (usando el ID de Auth)
  const emp = await getEmpleadoById(authData.user.id);

  // Validar que el empleado exista, esté activo y pertenezca a esta lavandería
  if (!emp || !emp.activo || emp.tenant_id !== tenant.id) {
    await supabase.auth.signOut();
    return { ok: false, error: "Acceso denegado para esta sucursal" };
  }

  setSession({ empleado_id: emp.id, tenant_id: tenant.id, iniciado_en: new Date().toISOString() });
  setActiveTenant(slug);
  return { ok: true, empleado: emp, tenant };
}

export async function logout() {
  await supabase.auth.signOut();
  setSession(null);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Si no hay usuario en Supabase, limpiar sesión local por seguridad
    if (isBrowser()) localStorage.removeItem("lvx:session");
    return null;
  }

  const email = user.email?.toLowerCase();
  const isSuperAdmin = email && ADMIN_EMAILS.includes(email);

  // Intentar recuperar la sesión guardada para saber qué perfil/tenant usar
  const sessionStr = isBrowser() ? localStorage.getItem("lvx:session") : null;
  let session: Session | null = null;
  if (sessionStr) {
    try {
      session = JSON.parse(sessionStr);
    } catch { }
  }

  // Caso 1: Es Super Admin
  if (isSuperAdmin) {
    // Si tiene un tenant_id en la sesión, usar ese
    if (session?.tenant_id && session.tenant_id !== "admin") {
      const ten = await getTenantById(session.tenant_id);
      if (ten) {
        return {
          empleado: {
            id: "admin",
            tenant_id: ten.id,
            nombre: "Super Admin",
            email: email || "admin@klynn.com.do",
            password: "***",
            rol: "ADMIN",
            activo: true,
            permisos: PERMISOS_SISTEMA.map((p) => p.id),
            creado_en: new Date().toISOString(),
          } as Empleado,
          tenant: ten,
        };
      }
    }
    // Si no, devolver sin tenant específico (o el primero que encuentre)
    return {
      empleado: {
        id: "admin",
        tenant_id: "admin",
        nombre: "Super Admin",
        email: email || "admin@klynn.com.do",
        rol: "ADMIN",
        activo: true,
        permisos: PERMISOS_SISTEMA.map((p) => p.id),
        creado_en: new Date().toISOString(),
      } as any,
      tenant: { id: "admin", nombre: "Administración Global" } as any,
    };
  }

  // Caso 2: Usuario regular
  const { data: emps } = await supabase
    .from("empleados")
    .select("*")
    .eq("email", email)
    .eq("activo", true);

  if (!emps || emps.length === 0) {
    if (isBrowser()) localStorage.removeItem("lvx:session");
    return null;
  }

  // 1. Intentar hacer match con el tenant_id de la sesión guardada
  if (session?.tenant_id) {
    const empMatch = emps.find((e) => e.tenant_id === session.tenant_id);
    if (empMatch) {
      const ten = await getTenantById(empMatch.tenant_id);
      if (ten) {
        setSession({
          empleado_id: empMatch.id,
          tenant_id: ten.id,
          iniciado_en: new Date().toISOString(),
        });
        return { empleado: empMatch, tenant: ten };
      }
    }
  }

  // 2. Intentar hacer match con el slug activo (activeTenant)
  const activeSlug = isBrowser() ? localStorage.getItem(KEY.active) : null;
  if (activeSlug) {
    const ten = await getTenantBySlug(activeSlug);
    if (ten) {
      const empMatch = emps.find((e) => e.tenant_id === ten.id);
      if (empMatch) {
        setSession({
          empleado_id: empMatch.id,
          tenant_id: ten.id,
          iniciado_en: new Date().toISOString(),
        });
        return { empleado: empMatch, tenant: ten };
      }
    }
  }

  // 3. Fallback al primer empleado encontrado
  const emp = emps[0];
  const ten = await getTenantById(emp.tenant_id);
  if (ten) {
    setSession({ empleado_id: emp.id, tenant_id: ten.id, iniciado_en: new Date().toISOString() });
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
  if (now < start) return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = start.getDate();

  let cycleStart = new Date(
    year,
    month,
    day,
    0,
    0,
    0,
    0,
  );

  // Manejar el desbordamiento de fin de mes (ej. si el mes tiene menos días que el día de aniversario)
  if (cycleStart.getDate() !== day) {
    cycleStart = new Date(
      year,
      month + 1,
      0,
      0,
      0,
      0,
      0,
    );
  }

  // Si la fecha calculada está en el futuro, el ciclo actual comenzó en el mes anterior
  if (cycleStart > now) {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = year - 1;
    }
    cycleStart = new Date(
      prevYear,
      prevMonth,
      day,
      0,
      0,
      0,
      0,
    );
    if (cycleStart.getDate() !== day) {
      cycleStart = new Date(
        prevYear,
        prevMonth + 1,
        0,
        0,
        0,
        0,
        0,
      );
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

  const isGracePeriod = baseLimit !== null && orderCount >= baseLimit && orderCount < (effectiveLimit ?? 0);
  const ordersReached = effectiveLimit !== null && orderCount >= effectiveLimit;
  const employeesReached = employeeCount >= plan.limite_empleados;

  const graceUsed = isGracePeriod ? Math.max(0, orderCount - baseLimit) : (baseLimit !== null && orderCount >= (effectiveLimit ?? 0) ? GRACE_ORDERS_BONUS : 0);
  const graceRemaining = isGracePeriod && effectiveLimit !== null ? Math.max(0, effectiveLimit - orderCount) : (orderCount < (baseLimit ?? Infinity) ? GRACE_ORDERS_BONUS : 0);

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
  if (!isBrowser()) return;
  await getPlans();
  const existingTenants = await getTenants();
  if (existingTenants.length > 0) return;

  const tenantId = uid("ten");
  const tenant: Tenant = {
    id: tenantId,
    nombre: "Lavandería La Burbuja",
    slug: "laburbuja",
    rnc: "131-12345-6",
    telefono: "809-555-0142",
    direccion: "Av. Lope de Vega #45, Naco",
    ciudad: "Santo Domingo",
    email: "admin@laburbuja.do",
    color_primario: "#1B4B73",
    color_secundario: "#F0B900",
    plan_id: "pro",
    estado: "TRIAL",
    trial_hasta: new Date(Date.now() + 14 * 86400000).toISOString(),
    creado_en: new Date(Date.now() - 30 * 86400000).toISOString(),
    config: { ...DEFAULT_CONFIG },
  };
  await saveTenant(tenant);

  const adminId = uid("emp");
  await saveEmpleado({
    id: adminId,
    tenant_id: tenantId,
    nombre: "María González",
    email: "admin@laburbuja.do",
    password: "demo1234",
    rol: "ADMIN",
    activo: true,
    creado_en: new Date().toISOString(),
    pin: "1234",
  });
  await saveEmpleado({
    id: uid("emp"),
    tenant_id: tenantId,
    nombre: "Carlos Rodríguez",
    email: "vendedor@laburbuja.do",
    password: "demo1234",
    rol: "VENDEDOR",
    activo: true,
    creado_en: new Date().toISOString(),
    pin: "5678",
  });
  await saveEmpleado({
    id: uid("emp"),
    tenant_id: tenantId,
    nombre: "Luis Fernández",
    email: "repartidor@laburbuja.do",
    password: "demo1234",
    rol: "REPARTIDOR",
    activo: true,
    creado_en: new Date().toISOString(),
  });

  // Servicios
  const servSeed: Array<Omit<Servicio, "id" | "tenant_id">> = [
    {
      nombre: "Lavado y secado",
      descripcion: "Lavado completo + secadora",
      icono: "🧺",
      activo: true,
      precio: 0,
    },
    {
      nombre: "Solo lavado",
      descripcion: "Solo lavado en agua",
      icono: "💧",
      activo: true,
      precio: 0,
    },
    {
      nombre: "Solo secado",
      descripcion: "Únicamente secadora",
      icono: "🌬️",
      activo: true,
      precio: 0,
    },
    {
      nombre: "Planchado",
      descripcion: "Planchado profesional",
      icono: "♨️",
      activo: true,
      precio: 0,
    },
    {
      nombre: "Lavado en seco",
      descripcion: "Dry cleaning para prendas delicadas",
      icono: "✨",
      activo: true,
      precio: 50,
    },
    {
      nombre: "Sastrería",
      descripcion: "Arreglos y costura",
      icono: "🪡",
      activo: true,
      precio: 100,
    },
    {
      nombre: "Tapicería",
      descripcion: "Limpieza de muebles y tapizados",
      icono: "🛋️",
      activo: true,
      precio: 500,
    },
    {
      nombre: "Alfombras",
      descripcion: "Lavado de alfombras y tapetes",
      icono: "🟫",
      activo: true,
      precio: 300,
    },
  ];
  for (const s of servSeed) {
    await saveServicio({ ...s, id: uid("srv"), tenant_id: tenantId });
  }

  // Clientes
  const clientesData = [
    {
      nombre: "Juan Pérez",
      telefono: "809-321-4567",
      email: "juan@email.com",
      direccion: "Calle Duarte 12, Piantini",
      tipo: "Consumidor Final" as const,
      limite_credito: 0,
    },
    {
      nombre: "Ana Martínez",
      telefono: "829-555-1122",
      email: "ana@email.com",
      direccion: "Av. 27 de Febrero 88, Bella Vista",
      tipo: "Consumidor Final" as const,
      limite_credito: 5000,
    },
    {
      nombre: "Pedro Jiménez",
      telefono: "849-777-3344",
      direccion: "Calle El Sol 5, Gazcue",
      tipo: "Empresa" as const,
      limite_credito: 3000,
    },
    {
      nombre: "Luisa Reyes",
      telefono: "809-444-9988",
      email: "luisa@email.com",
      tipo: "Consumidor Final" as const,
      limite_credito: 0,
    },
    {
      nombre: "Roberto Núñez",
      telefono: "809-222-5566",
      direccion: "Av. Sarasota 200, Bella Vista",
      tipo: "Consumidor Final" as const,
      limite_credito: 0,
    },
  ];
  const clientesIds: string[] = [];
  for (const c of clientesData) {
    const id = uid("cli");
    clientesIds.push(id);
    await saveCliente({
      ...c,
      id,
      tenant_id: tenantId,
      creado_en: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString(),
    });
  }

  // Caja abierta
  const cajaId = uid("caj");
  await saveCaja({
    id: cajaId,
    tenant_id: tenantId,
    empleado_id: adminId,
    monto_inicial: 2000,
    estado: "ABIERTA",
    abierta_en: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    notas_apertura: "Apertura turno mañana",
  });
  await saveMovimiento({
    id: uid("mov"),
    tenant_id: tenantId,
    caja_id: cajaId,
    empleado_id: adminId,
    tipo: "INGRESO",
    concepto: "Apertura de caja",
    monto: 2000,
    creado_en: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
  });

  // Algunas órdenes históricas y de hoy
  const items1: OrdenItem[] = [
    { descripcion: "Camisa manga larga", cantidad: 2, precio_unitario: 150 },
    { descripcion: "Pantalón de vestir", cantidad: 1, precio_unitario: 200 },
  ];
  const items2: OrdenItem[] = [
    { descripcion: "Lavado por libra", cantidad: 4.5, precio_unitario: 80, es_libra: true },
  ];
  const items3: OrdenItem[] = [
    { descripcion: "Edredón matrimonial", cantidad: 1, precio_unitario: 450 },
    { descripcion: "Sábana king", cantidad: 2, precio_unitario: 280 },
  ];

  async function crearOrden(
    idx: number,
    items: OrdenItem[],
    estado: EstadoOrden,
    metodo: MetodoPago,
    hoursAgo: number,
    urgente = false,
  ) {
    const subtotal = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const itbis = +(subtotal * 0.18).toFixed(2);
    const total = +(subtotal + itbis).toFixed(2);
    const pagado = metodo === "CREDITO" ? 0 : total;
    const saldo = total - pagado;
    const id = uid("ord");
    const numero = await nextOrdenNumero(tenantId);
    const creado = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    await saveOrden({
      id,
      tenant_id: tenantId,
      numero,
      cliente_id: clientesIds[idx % clientesIds.length],
      empleado_id: adminId,
      servicios: ["Lavado y secado"],
      items,
      subtotal,
      itbis,
      descuento: 0,
      total,
      pagado,
      saldo,
      metodo_pago: metodo,
      estado,
      fecha_entrega: new Date(Date.now() + 2 * 86400000).toISOString(),
      es_urgente: urgente,
      creado_en: creado,
    });
    if (metodo !== "CREDITO" && estado !== "ANULADA") {
      await saveMovimiento({
        id: uid("mov"),
        tenant_id: tenantId,
        caja_id: cajaId,
        empleado_id: adminId,
        tipo: "VENTA",
        concepto: `Venta ${numero}`,
        monto: total,
        metodo,
        orden_id: id,
        creado_en: creado,
      });
    }
  }

  await crearOrden(0, items1, "ENTREGADA", "EFECTIVO", 5);
  await crearOrden(1, items2, "LISTA", "TARJETA", 3);
  await crearOrden(2, items3, "EN_PROCESO", "CREDITO", 2);
  await crearOrden(3, items1, "RECIBIDA", "EFECTIVO", 1, true);
  await crearOrden(4, items2, "EN_PROCESO", "TRANSFERENCIA", 0.5);

  // Gastos
  await saveGasto({
    id: uid("gas"),
    tenant_id: tenantId,
    empleado_id: adminId,
    categoria: "Suministros",
    descripcion: "Detergente líquido 5gal",
    monto: 850,
    metodo_pago: "Efectivo",
    proveedor: "Distribuidora Sol",
    fecha: new Date().toISOString(),
    aprobado: true,
  });
  await saveGasto({
    id: uid("gas"),
    tenant_id: tenantId,
    empleado_id: adminId,
    categoria: "Servicios (luz, agua, internet)",
    descripcion: "Factura EDESUR",
    monto: 4200,
    metodo_pago: "Transferencia",
    fecha: new Date(Date.now() - 86400000).toISOString(),
    aprobado: true,
  });

  setActiveTenant(tenant.slug);
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
  const { data, error } = await supabase
    .from("ecf_config")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function saveECFConfig(config: ECFConfig) {
  const existing = await getECFConfig(config.tenant_id);
  const payload = {
    ...config,
    id: existing?.id || config.id || crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("ecf_config").upsert(payload);
  if (error) throw error;
}

export async function getECFSequences(tenantId: string): Promise<ECFSequence[]> {
  const { data, error } = await supabase
    .from("ecf_sequences")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) return [];
  return data || [];
}

export async function saveECFSequence(seq: ECFSequence) {
  const { error } = await supabase.from("ecf_sequences").upsert(seq);
  if (error) throw error;
}

export async function deleteECFSequence(id: string) {
  const { error } = await supabase.from("ecf_sequences").delete().eq("id", id);
  if (error) throw error;
}

export async function getECFDocuments(tenantId: string): Promise<ECFDocument[]> {
  const { data, error } = await supabase
    .from("ecf_documents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("fecha_emision", { ascending: false });
  if (error) {
    console.warn("Aviso al obtener ecf_documents:", error);
    return [];
  }
  return (data || []).map((doc: any) => ({
    ...doc,
    pdf_url: doc.pdf_url || doc.dgii_response?.pdf || doc.dgii_response?.pdf_url,
    xml_url: doc.xml_url || doc.dgii_response?.xmlUrl || doc.dgii_response?.xml_url,
    document_stamp_url: doc.document_stamp_url || doc.dgii_response?.documentStampUrl || doc.qr_content,
    security_code: doc.security_code || doc.dgii_response?.securityCode,
    contingency_mode: doc.contingency_mode ?? doc.dgii_response?.contingencyMode ?? false,
    legal_status: doc.legal_status || doc.dgii_response?.legalStatus,
    pronesoft_id: doc.pronesoft_id || doc.dgii_response?.id,
  }));
}

export async function saveECFDocument(doc: ECFDocument) {
  // Construir objeto limpio respetando estrictamente el esquema oficial de la tabla ecf_documents
  const cleanDoc: Record<string, any> = {
    id: doc.id,
    tenant_id: doc.tenant_id,
    order_id: doc.order_id || null,
    encf: doc.encf,
    tipo_ecf: doc.tipo_ecf,
    rnc_receptor: doc.rnc_receptor || null,
    track_id: doc.track_id || null,
    status: doc.status || 'pending',
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
    xml_content: doc.xml_content || (doc as any).xml_url || (doc.dgii_response as any)?.xmlUrl || "",
    qr_content: doc.qr_content || (doc as any).document_stamp_url || null,
    monto_total: doc.monto_total ?? 0,
    monto_itbis: doc.monto_itbis ?? 0,
    fecha_emision: doc.fecha_emision || new Date().toISOString(),
  };

  const { error } = await supabase.from("ecf_documents").upsert(cleanDoc);
  if (error) {
    if (error.code === "23503" && cleanDoc.order_id) {
      // Reintentar sin order_id si la orden aún está en proceso de creación
      cleanDoc.order_id = null;
      const { error: retryError } = await supabase.from("ecf_documents").upsert(cleanDoc);
      if (retryError) {
        console.error("Error al guardar ECFDocument en Supabase:", retryError);
        throw retryError;
      }
    } else {
      console.error("Error al guardar ECFDocument en Supabase:", error);
      throw error;
    }
  }
}

export async function nextECFNumero(
  tenantId: string,
  tipo: string,
): Promise<{ ncf: string; expiration_date?: string }> {
  const normalizedTipo = tipo.startsWith("E") || tipo.startsWith("B")
    ? tipo
    : `E${tipo}`;

  // 1. Intentar RPC en base de datos si está disponible
  try {
    const { data, error } = await supabase.rpc("reservar_proximo_ncf", {
      p_tenant_id: tenantId,
      p_tipo_ecf: normalizedTipo,
    });

    if (!error && data && data.length > 0 && data[0]?.ncf) {
      return { ncf: data[0].ncf, expiration_date: data[0].expiration_date };
    }
  } catch (rpcErr) {
    // silencioso para RPC no configurado
  }

  // 2. Fallback de cliente buscando en la tabla de secuencias
  try {
    const { data: sequences, error } = await supabase
      .from("ecf_sequences")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("tipo_ecf", normalizedTipo)
      .eq("is_active", true);

    const seq = sequences && sequences.length > 0 ? sequences[0] : null;

    if (!error && seq) {
      if (seq.valor_actual < seq.valor_final) {
        const current = seq.valor_actual || 0;
        const initial = seq.valor_inicial || 1;
        const proximo = current < initial ? initial : current + 1;

        const padLen = normalizedTipo.startsWith("E") ? 10 : 8;
        const encf = `${normalizedTipo}${String(proximo).padStart(padLen, "0")}`;

        // Actualizamos el contador en segundo plano
        await supabase.from("ecf_sequences").update({ valor_actual: proximo }).eq("id", seq.id);

        return { ncf: encf, expiration_date: seq.expiration_date };
      }
    }
  } catch (dbErr) {
    console.warn("Aviso al consultar secuencia local:", dbErr);
  }

  // 3. Fallback inteligente seguro
  const padLen = normalizedTipo.startsWith("E") ? 10 : 8;
  return {
    ncf: `${normalizedTipo}${String(1).padStart(padLen, "0")}`,
    expiration_date: undefined,
  };
}

import { getProneSoftClient } from "./fiscal/pronesoft-client";

export async function getECFDocumentosRecibidos(tenantId: string): Promise<ECFDocumentRecibido[]> {
  try {
    // 1. Obtener la config fiscal para saber si tiene pronesoft_tenant_id y está activo
    const { data: config } = await supabase
      .from("ecf_config")
      .select("is_active, pronesoft_tenant_id, ambiente, usar_credenciales_propias, pronesoft_client_id, pronesoft_client_secret")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const isUUID = config?.pronesoft_tenant_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.pronesoft_tenant_id);

    if (config?.is_active && isUUID) {
      const pronesoft = getProneSoftClient(
        config.pronesoft_tenant_id,
        config.ambiente === "pruebas" ? "sandbox" : "production",
        config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
        config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined
      );
      const res = await pronesoft.listReceivedDocuments(1, 100);

      // Si hay datos, upsertarlos en la base de datos local
      if (res && res.data && res.data.length > 0) {
        const ops = res.data.map((doc: any) => ({
          tenant_id: tenantId,
          id: doc.id || doc.trackId || doc.eNcf || doc.encf,
          tipo_ecf: doc.documentType || (doc.eNcf ? doc.eNcf.substring(0, 3) : (doc.encf ? doc.encf.substring(0, 3) : "E31")),
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
          config.ambiente === "pruebas" ? "sandbox" : "production",
          config.usar_credenciales_propias ? config.pronesoft_client_id : undefined,
          config.usar_credenciales_propias ? config.pronesoft_client_secret : undefined
        );
        await pronesoft.submitCommercialApproval(id, estado === "APROBADO" ? "ACCEPTED" : "REJECTED");
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
  const { data } = await supabase
    .from("notificaciones")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
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
        channel.send({
          type: "broadcast",
          event: "nueva_notificacion",
          payload: newNotif,
        }).then(() => {
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
