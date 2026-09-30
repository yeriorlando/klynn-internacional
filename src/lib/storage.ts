import { supabase, ensureFreshSupabaseSession } from "./supabase";
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
  getTenantByIdServer,
  saveTenantConfigServer,
  saveEmployeeServer,
  deleteEmployeeServer,
} from "./server-auth";
import { getCountry } from "./countries";

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
    promociones?: boolean;
    nomina?: boolean;
    cxp?: boolean;
  };
  destacado?: boolean;
  es_especial?: boolean;
  titulo_especial?: string;
  polar_product_monthly_url?: string;
  polar_product_yearly_url?: string;
  precio_sucursal_adicional?: number;
  polar_sucursal_url?: string;
  limite_sucursales_adicionales?: number;
  pais_codigo?: string;
  moneda_simbolo?: string;
  moneda_codigo?: string;
}

export interface BankDetails {
  banco: string;
  titular: string;
  rnc: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  country_plans?: Record<string, Plan[]>;
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
  country_plans?: Record<string, Plan[]>;
  bankDetails?: BankDetails;
  requireEmployeeOtp?: boolean;
  whatsapp_engine?: "klynn_connect" | "meta_cloud" | "wasender" | "neuroapi";
  klynn_connect_url?: string;
  klynn_connect_apikey?: string;
  meta_app_id?: string;
  meta_config_id?: string;
  meta_app_secret?: string;
  neuroapi_master_api_key?: string;
  neuroapi_enabled?: boolean;
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
  salario_base?: number;
  frecuencia_pago?: "QUINCENAL" | "SEMANAL" | "MENSUAL";
  tipo_contrato?: "FIJO" | "DESTAJO_COMISION" | "MIXTO";
  metodo_pago?: "TRANSFERENCIA" | "EFECTIVO" | "CHEQUE";
  banco_nombre?: string;
  numero_cuenta_banco?: string;
  tipo_cuenta_banco?: "AHORROS" | "CORRIENTE";
  aplica_tss?: boolean;
  aplica_isr?: boolean;
  monto_por_docena_planchado?: number;
  monto_por_entrega_delivery?: number;
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
  auto_renovacion?: boolean;
  nombre_sucursal?: string;
  // Localización Internacional
  pais_codigo?: string;
  moneda_simbolo?: string;
  moneda_codigo?: string;
  impuesto_nombre?: string;
  impuesto_porcentaje?: number;
  documento_fiscal_label?: string;
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
  mostrar_columna_itbis?: boolean;
  cobrar_impuesto?: boolean;
  razon_social?: string;
  formato_ticket: "57mm" | "80mm";
  ticket_prefijo_orden?: string;
  ticket_formato_numero?: "estandar" | "corto";
  impresora_tipo?: "usb" | "bluetooth" | "serial" | "sistema";
  impresora_perfil?: "basica" | "estandar" | "completa";
  impresora_serial_baud?: number;
  /** Etiqueta legible del puerto/impresora seleccionada (Web Serial o sistema). */
  impresora_nombre?: string;
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
  pos_modalidad_operativa?: "SOLO_PRENDAS" | "PRENDAS_CON_SERVICIOS" | "SERVICIOS_PRIMERO" | "FLEXIBLE";
  pos_modal_desglose?: boolean;
  pos_modo_defecto?: boolean;
  pos_auto_imprimir?: boolean;
  pos_requerir_nota_confirmacion?: boolean;
  ticket_imprimir_taller_auto?: boolean;
  ticket_taller_solo_con_ubicacion?: boolean;
  ticket_imprimir_copia_caja?: boolean;
  ticket_imprimir_marquillas_auto?: boolean;
  usar_ubicacion_ropa?: boolean;
  estanteria_zonas?: EstanteriaZona[];
  meses_pagados_override?: number;
  auto_renovacion?: boolean;
  plan_fecha_inicio?: string;
  ordenes_reset_at?: string;
  modulos_override?: {
    whatsapp?: boolean;
    facturacion_fiscal?: boolean;
    multisucursal?: boolean;
    logistica?: boolean;
    procesos?: boolean;
    estanteria?: boolean;
    pos_offline?: boolean;
    promociones?: boolean;
    nomina?: boolean;
    cxp?: boolean;
  };
  habilitar_control_marbetes?: boolean;
  ultimo_marbete_color?: string;
  ultimo_marbete_secuencia?: number;
  bloqueo_inactividad_minutos?: number;
  descuento_cliente_activo?: boolean;
  whatsapp_web_manual?: boolean;

  // Exclusión de Muestras del Catálogo (Prendas y Servicios por defecto)
  prendas_excluidas_muestra?: string[];
  servicios_excluidos_muestra?: string[];

  // Políticas de Seguridad y Control de Terminales
  control_terminales_activo?: boolean;
  terminales_autorizadas?: TerminalAutorizada[];
  solicitudes_vinculacion?: SolicitudVinculacion[];

  // Control de Horario Laboral de Sucursal
  control_horario_activo?: boolean;
  horario_apertura?: string;
  horario_cierre?: string;
  dias_laborables?: number[];
  margen_gracia_minutos?: number;

  // Sesión Única para Empleados
  impedir_sesiones_simultaneas?: boolean;
  active_employee_sessions?: Record<string, string>;

  // Localización Internacional
  pais_codigo?: string;
  moneda_simbolo?: string;
  moneda_codigo?: string;
  impuesto_nombre?: string;
  impuesto_porcentaje?: number;
  documento_fiscal_label?: string;
}

export interface TerminalAutorizada {
  id: string;
  nombre: string;
  token: string;
  creado_en: string;
  ultimo_acceso?: string;
  user_agent?: string;
}

export interface SolicitudVinculacion {
  codigo: string;
  temporal_token: string;
  nombre_dispositivo?: string;
  creado_en: string;
  expira_en: string;
  aprobada?: boolean;
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
  base_url?: string; // por defecto https://wasenderapi.com o https://wa.klynncloud.com
  provider?: "klynn_connect" | "meta_cloud" | "wasender" | "neuroapi";
  klynn_connect_status?: "open" | "close" | "connecting" | "disconnected";
  klynn_connect_phone?: string;
  klynn_connect_profile_pic?: string;
  klynn_connect_profile_name?: string;
  meta_phone_number_id?: string;
  meta_waba_id?: string;
  meta_access_token?: string;
  meta_phone_number?: string;
  meta_verified_name?: string;
  meta_status?: "connected" | "disconnected" | "expired";
  // NeuroAPI (WhatsApp Oficial con Coexistencia)
  neuroapi_phone_number_id?: string;
  neuroapi_waba_id?: string;
  neuroapi_phone_number?: string;
  neuroapi_verified_name?: string;
  neuroapi_session_id?: string;
  neuroapi_status?: "connected" | "disconnected";
  neuroapi_is_coexistence?: boolean;
  neuroapi_api_key?: string;
  notif_orden_creada: boolean;
  notif_orden_lista: boolean;
  notif_orden_entregada: boolean;
  notif_orden_sin_retirar?: boolean;
  dias_recordatorio_sin_retirar?: number;
  plantilla_creada: string;
  plantilla_lista: string;
  plantilla_entregada: string;
  plantilla_sin_retirar?: string;
  plantilla_en_camino?: string;
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
  descuento_fijo?: number;
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
  permitir_editar_precio?: boolean;
  cantidad_prendas?: number;
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
  prioridad?: "NORMAL" | "URGENTE";
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
  nota_credito_anula_totalmente?: boolean;
  nota_credito_qr?: string; // Timbre/URL QR propio de la E34
  nota_credito_codigo_seguridad?: string; // Código de seguridad propio de la E34
  nota_credito_fecha_firma?: string; // Fecha de firma digital propia de la E34
  nota_credito_fecha_emision?: string; // Fecha de emisión propia de la E34
  nota_credito_estado?: string; // Estado fiscal de la E34 devuelto por EF2/DGII
  nota_credito_pdf_url?: string;
  nota_credito_xml_url?: string;
  nota_debito_ncf?: string; // NCF de la nota de débito (E33)
  nota_debito_id?: string; // ID del documento ECF E33
  nota_debito_monto?: number; // Monto adicionado
  nota_debito_qr?: string;
  nota_debito_codigo_seguridad?: string;
  nota_debito_fecha_firma?: string;
  nota_debito_fecha_emision?: string;
  nota_debito_estado?: string;
  nota_debito_pdf_url?: string;
  nota_debito_xml_url?: string;
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
  marbete_color?: string;
  marbete_piezas?: number;
  marbete_secuencia?: number;
  marbetes?: MarbeteItem[];
  promocion_id?: string;
  promocion_nombre?: string;
}

export interface MarbeteItem {
  id?: string;
  color: string;
  piezas: number;
  secuencia: number | string;
}

export interface Promocion {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  tipo_descuento: "PORCENTAJE" | "MONTO_FIJO" | "CANTIDAD_NXM";
  valor_descuento: number;
  nxm_compra?: number | null; // Cantidad de prendas que debe traer (ej. 3 para 3x2)
  nxm_gratis?: number | null; // Cantidad de prendas bonificadas (ej. 1)
  nxm_porcentaje?: number | null; // Porcentaje de descuento en prenda bonificada (default 100% = gratis)
  tipo_aplicacion: "TODA_LA_ORDEN" | "POR_CATEGORIA" | "POR_SERVICIO" | "POR_PRENDA";
  categorias?: string[];
  servicios?: string[];
  prendas?: string[];
  dias_semana: number[]; // 0 = Dom, 1 = Lun, ..., 6 = Sáb
  fecha_inicio?: string;
  fecha_fin?: string;
  min_piezas?: number;
  min_subtotal?: number;
  min_libras?: number;
  codigo_cupon?: string;
  es_automatica: boolean;
  activo: boolean;
  veces_usada: number;
  total_descontado: number;
  creado_en: string;
  actualizado_en?: string;
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
  proveedor_ecf?: "ef2" | "pronesoft";
  ef2_username?: string;
  ef2_token?: string;
  ef2_environment?: "TesteCF" | "CerteCF" | "eCF";
  ef2_credentials_owner?: "platform" | "tenant";
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
  ef2_sequence_id?: number;
  ef2_synced_at?: string;
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
  provider?: "ef2" | "pronesoft";
  provider_document_id?: string;
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
  proveedor_rnc?: string;
  comprobante_url?: string;
  fecha: string;
  aprobado: boolean;
  is_caja_chica?: boolean;
  ncf?: string;
  tipo_ecf?: string;
  ecf_status?: string;
  ecf_track_id?: string;
  ecf_qr?: string;
  categoria_id?: string;
  plantilla_id?: string;
  suplidor_id?: string;
  origen?: "OPERATIVO" | "CAJA_CHICA" | "FISCAL_E41";
  estado?: "REGISTRADO" | "BORRADOR";
}

export interface SaveGastoResult {
  synced: boolean;
  queued: boolean;
  error?: string;
  errorCode?: string;
}

export interface GastoCategoria {
  id: string;
  tenant_id: string;
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
  orden: number;
  creado_en: string;
  actualizado_en?: string;
}

export type FrecuenciaGasto = "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "ANUAL";

export interface GastoPlantilla {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  categoria_nombre: string;
  suplidor_id?: string;
  proveedor_nombre?: string;
  metodo_pago: string;
  monto_predeterminado?: number;
  es_recurrente: boolean;
  frecuencia?: FrecuenciaGasto;
  dia_vencimiento?: number;
  proxima_fecha?: string;
  activo: boolean;
  usos: number;
  ultimo_uso_en?: string;
  creado_en: string;
  actualizado_en?: string;
}

export interface CatalogoItem {
  id: string;
  tenant_id: string;
  categoria: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precios_servicios?: Record<string, any>;
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
  permite_piezas_adicionales?: boolean;
  piezas_incluidas?: number;
  precio_pieza_adicional?: number;
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

// ============ Cuentas por Pagar (CXP) ============
export type CategoriaInsumo =
  | "QUIMICOS"
  | "EMPAQUE"
  | "CALDERAS_REPUESTOS"
  | "COMBUSTIBLE"
  | "SERVICIOS"
  | "OTROS"
  | (string & {});

export interface Suplidor {
  id: string;
  tenant_id: string;
  nombre_comercial: string;
  razon_social?: string;
  rnc_cedula?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_nombre?: string;
  categoria_insumo: CategoriaInsumo;
  dias_credito_default: number;
  limite_credito?: number;
  notas?: string;
  activo: boolean;
  creado_en: string;
  actualizado_en?: string;
}

export type EstadoFacturaCXP = "PENDIENTE" | "PARCIAL" | "PAGADA" | "ANULADA";
export type EstadoMoraCXP = "AL_DIA" | "POR_VENCER" | "VENCIDA" | "CRITICA" | "PAGADA";

export interface FacturaCXP {
  id: string;
  tenant_id: string;
  suplidor_id: string;
  numero_factura: string;
  ncf?: string;
  tipo_ncf: string;
  fecha_emision: string;
  plazo_dias: number;
  fecha_vencimiento: string;
  subtotal: number;
  itbis: number;
  total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado: EstadoFacturaCXP;
  categoria_gasto: string;
  descripcion?: string;
  comprobante_url?: string;
  creado_por?: string;
  creado_en: string;
  actualizado_en?: string;
  // Joins y campos computados
  suplidor?: Suplidor;
  dias_vencida?: number;
  estado_mora?: EstadoMoraCXP;
}

export interface AbonoFacturaCXP {
  id: string;
  tenant_id: string;
  factura_cxp_id: string;
  suplidor_id: string;
  empleado_id: string;
  monto: number;
  metodo_pago: "TRANSFERENCIA" | "EFECTIVO" | "CHEQUE" | "TARJETA";
  banco_origen?: string;
  referencia_bancaria?: string;
  caja_id?: string;
  gasto_id?: string;
  notas?: string;
  fecha_pago: string;
  creado_en: string;
}

// ============ Nómina de Empleados ============
export interface AnticipoNomina {
  id: string;
  tenant_id: string;
  empleado_id: string;
  monto: number;
  fecha: string;
  motivo?: string;
  caja_id?: string;
  estado: "PENDIENTE" | "DESCONTADO" | "ANULADO";
  periodo_nomina_id?: string;
  creado_por?: string;
  creado_en: string;
  empleado?: Empleado;
}

export type EstadoPeriodoNomina = "BORRADOR" | "APROBADA" | "PAGADA" | "ANULADA";
export type FrecuenciaNomina = "QUINCENAL" | "SEMANAL" | "MENSUAL" | "REGALIA";

export interface PeriodoNomina {
  id: string;
  tenant_id: string;
  codigo: string;
  nombre: string;
  frecuencia: FrecuenciaNomina;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string;
  total_bruto: number;
  total_deducciones: number;
  total_neto: number;
  total_empleados: number;
  estado: EstadoPeriodoNomina;
  notas?: string;
  aprobado_por?: string;
  creado_por?: string;
  creado_en: string;
  actualizado_en?: string;
}

export interface DetalleNomina {
  id: string;
  tenant_id: string;
  periodo_id: string;
  empleado_id: string;
  salario_base_periodo: number;
  comisiones_destajo: number;
  horas_extras: number;
  cantidad_horas_extras?: number;
  bonos_incentivos: number;
  otros_ingresos: number;
  total_ingresos: number;
  anticipos_descontados: number;
  tss_afp: number;
  tss_sfs: number;
  isr_retencion: number;
  otras_deducciones: number;
  total_deducciones: number;
  neto_pagar: number;
  metodo_pago: "TRANSFERENCIA" | "EFECTIVO" | "CHEQUE";
  pagado: boolean;
  fecha_pago?: string;
  referencia_pago?: string;
  notas?: string;
  creado_en: string;
  empleado?: Empleado;
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
  gastos_categorias: "lvx:gastos_categorias",
  gastos_plantillas: "lvx:gastos_plantillas",
  catalogo: "lvx:catalogo",
  servicios: "lvx:servicios",
  active: "lvx:activeTenant",
  session: "lvx:session",
  seq: "lvx:orden_seq",
  globalConfig: "lvx:globalConfig",
  invitaciones: "lvx:invitaciones",
  suplidores: "lvx:suplidores",
  facturas_cxp: "lvx:facturas_cxp",
  abonos_cxp: "lvx:abonos_cxp",
  anticipos_nomina: "lvx:anticipos_nomina",
  periodos_nomina: "lvx:periodos_nomina",
  detalles_nomina: "lvx:detalles_nomina",
};

export const ADMIN_EMAILS = ["admin@klynncloud.com", "admin@klynn.com.do", "yeriorlando@gmail.com"];

export const PLANS: Plan[] = [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 750,
      precio_anual: 7500,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
    },
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
      promociones: false,
      nomina: false,
      cxp: false,
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
      promociones: true,
      nomina: true,
      cxp: true,
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
      promociones: true,
      nomina: true,
      cxp: true,
    },
    precio_sucursal_adicional: 1500,
    limite_sucursales_adicionales: 5,
    polar_sucursal_url: "",
    pais_codigo: "DO",
    moneda_simbolo: "RD$",
    moneda_codigo: "DOP",
  },
];

export const DEFAULT_COUNTRY_PLANS: Record<string, Plan[]> = {
  DO: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 750,
      precio_anual: 7500,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "DO",
      moneda_simbolo: "RD$",
      moneda_codigo: "DOP",
    },
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
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 1000,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "DO",
      moneda_simbolo: "RD$",
      moneda_codigo: "DOP",
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 1200,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "DO",
      moneda_simbolo: "RD$",
      moneda_codigo: "DOP",
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 1500,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "DO",
      moneda_simbolo: "RD$",
      moneda_codigo: "DOP",
    },
  ],
  MX: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 190,
      precio_anual: 1900,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "MX",
      moneda_simbolo: "$",
      moneda_codigo: "MXN",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 350,
      precio_anual: 3500,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 250,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "MX",
      moneda_simbolo: "$",
      moneda_codigo: "MXN",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 900,
      precio_anual: 9000,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 400,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "MX",
      moneda_simbolo: "$",
      moneda_codigo: "MXN",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 1300,
      precio_anual: 13000,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 600,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "MX",
      moneda_simbolo: "$",
      moneda_codigo: "MXN",
    },
  ],
  PE: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 39,
      precio_anual: 390,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "PE",
      moneda_simbolo: "S/",
      moneda_codigo: "PEN",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 69,
      precio_anual: 690,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 49,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "PE",
      moneda_simbolo: "S/",
      moneda_codigo: "PEN",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 169,
      precio_anual: 1690,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 79,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "PE",
      moneda_simbolo: "S/",
      moneda_codigo: "PEN",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 249,
      precio_anual: 2490,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 109,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "PE",
      moneda_simbolo: "S/",
      moneda_codigo: "PEN",
    },
  ],
  CO: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 39000,
      precio_anual: 390000,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "CO",
      moneda_simbolo: "$",
      moneda_codigo: "COP",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 69000,
      precio_anual: 690000,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 45000,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "CO",
      moneda_simbolo: "$",
      moneda_codigo: "COP",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 179000,
      precio_anual: 1790000,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 75000,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "CO",
      moneda_simbolo: "$",
      moneda_codigo: "COP",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 259000,
      precio_anual: 2590000,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 95000,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "CO",
      moneda_simbolo: "$",
      moneda_codigo: "COP",
    },
  ],
  PA: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 11,
      precio_anual: 110,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "PA",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 19,
      precio_anual: 190,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 12,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "PA",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 49,
      precio_anual: 490,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 20,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "PA",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 75,
      precio_anual: 750,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 30,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "PA",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
  ],
  CR: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 5500,
      precio_anual: 55000,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "CR",
      moneda_simbolo: "₡",
      moneda_codigo: "CRC",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 9900,
      precio_anual: 99000,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 6000,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "CR",
      moneda_simbolo: "₡",
      moneda_codigo: "CRC",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 24900,
      precio_anual: 249000,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 10000,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "CR",
      moneda_simbolo: "₡",
      moneda_codigo: "CRC",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 37900,
      precio_anual: 379000,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 15000,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "CR",
      moneda_simbolo: "₡",
      moneda_codigo: "CRC",
    },
  ],
  CL: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 9900,
      precio_anual: 99000,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "CL",
      moneda_simbolo: "$",
      moneda_codigo: "CLP",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 18000,
      precio_anual: 180000,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 11000,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "CL",
      moneda_simbolo: "$",
      moneda_codigo: "CLP",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 46000,
      precio_anual: 460000,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 19000,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "CL",
      moneda_simbolo: "$",
      moneda_codigo: "CLP",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 72000,
      precio_anual: 720000,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 28000,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "CL",
      moneda_simbolo: "$",
      moneda_codigo: "CLP",
    },
  ],
  EC: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 11,
      precio_anual: 110,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "EC",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 19,
      precio_anual: 190,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 12,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "EC",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 45,
      precio_anual: 450,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 18,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "EC",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 69,
      precio_anual: 690,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 28,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "EC",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
  ],
  ES: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 11,
      precio_anual: 110,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "ES",
      moneda_simbolo: "€",
      moneda_codigo: "EUR",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 19,
      precio_anual: 190,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 12,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "ES",
      moneda_simbolo: "€",
      moneda_codigo: "EUR",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 45,
      precio_anual: 450,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 18,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "ES",
      moneda_simbolo: "€",
      moneda_codigo: "EUR",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 69,
      precio_anual: 690,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 28,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "ES",
      moneda_simbolo: "€",
      moneda_codigo: "EUR",
    },
  ],
  GT: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 80,
      precio_anual: 800,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "GT",
      moneda_simbolo: "Q",
      moneda_codigo: "GTQ",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 149,
      precio_anual: 1490,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 90,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "GT",
      moneda_simbolo: "Q",
      moneda_codigo: "GTQ",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 349,
      precio_anual: 3490,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 150,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "GT",
      moneda_simbolo: "Q",
      moneda_codigo: "GTQ",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 549,
      precio_anual: 5490,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 220,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "GT",
      moneda_simbolo: "Q",
      moneda_codigo: "GTQ",
    },
  ],
  HN: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 260,
      precio_anual: 2600,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "HN",
      moneda_simbolo: "L",
      moneda_codigo: "HNL",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 475,
      precio_anual: 4750,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 290,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "HN",
      moneda_simbolo: "L",
      moneda_codigo: "HNL",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 1125,
      precio_anual: 11250,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 480,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "HN",
      moneda_simbolo: "L",
      moneda_codigo: "HNL",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 1725,
      precio_anual: 17250,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 700,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "HN",
      moneda_simbolo: "L",
      moneda_codigo: "HNL",
    },
  ],
  SV: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 11,
      precio_anual: 110,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "SV",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 19,
      precio_anual: 190,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 12,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "SV",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 45,
      precio_anual: 450,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 18,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "SV",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 69,
      precio_anual: 690,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 28,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "SV",
      moneda_simbolo: "$",
      moneda_codigo: "USD",
    },
  ],
  UY: [
    {
      id: "inicial",
      nombre: "Inicial",
      titulo_especial: "Para empezar",
      es_especial: true,
      precio_mensual: 420,
      precio_anual: 4200,
      limite_empleados: 1,
      limite_ordenes_mes: 120,
      limite_whatsapp_mes: 120,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: false,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 0,
      limite_sucursales_adicionales: 0,
      polar_sucursal_url: "",
      pais_codigo: "UY",
      moneda_simbolo: "$",
      moneda_codigo: "UYU",
    },
    {
      id: "basico",
      nombre: "Básico",
      precio_mensual: 760,
      precio_anual: 7600,
      limite_empleados: 2,
      limite_ordenes_mes: 250,
      limite_whatsapp_mes: 300,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: false,
        procesos: true,
        estanteria: true,
        pos_offline: false,
        promociones: false,
        nomina: false,
        cxp: false,
      },
      precio_sucursal_adicional: 480,
      limite_sucursales_adicionales: 1,
      polar_sucursal_url: "",
      pais_codigo: "UY",
      moneda_simbolo: "$",
      moneda_codigo: "UYU",
    },
    {
      id: "pro",
      nombre: "Pro",
      precio_mensual: 1800,
      precio_anual: 18000,
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
        promociones: true,
        nomina: true,
        cxp: true,
      },
      destacado: true,
      precio_sucursal_adicional: 750,
      limite_sucursales_adicionales: 3,
      polar_sucursal_url: "",
      pais_codigo: "UY",
      moneda_simbolo: "$",
      moneda_codigo: "UYU",
    },
    {
      id: "enterprise",
      nombre: "Enterprise",
      precio_mensual: 2800,
      precio_anual: 28000,
      limite_empleados: 999,
      limite_ordenes_mes: 1500,
      limite_whatsapp_mes: 5000,
      modulos: {
        whatsapp: true,
        facturacion_fiscal: false,
        multisucursal: true,
        logistica: true,
        procesos: true,
        estanteria: true,
        pos_offline: true,
        promociones: true,
        nomina: true,
        cxp: true,
      },
      precio_sucursal_adicional: 1100,
      limite_sucursales_adicionales: 5,
      polar_sucursal_url: "",
      pais_codigo: "UY",
      moneda_simbolo: "$",
      moneda_codigo: "UYU",
    },
  ],
};

export function formatCurrencyByCountry(amount: number, countryCode: string = "DO"): string {
  const c = getCountry(countryCode);
  const decimals = c.currency.decimals ?? 2;
  const numStr = Number(amount || 0).toLocaleString(countryCode === "DO" ? "es-DO" : "es", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${c.currency.symbol} ${numStr}`;
}

export async function getAllCountryPlans(): Promise<Record<string, Plan[]>> {
  try {
    const cfg = await getGlobalConfig();
    const stored = cfg.country_plans || cfg.bankDetails?.country_plans;
    if (stored && typeof stored === "object") {
      const merged: Record<string, Plan[]> = { ...DEFAULT_COUNTRY_PLANS };
      for (const [code, list] of Object.entries(stored)) {
        if (Array.isArray(list) && list.length > 0) {
          merged[code] = list;
        }
      }
      return merged;
    }
  } catch (_) {}
  return DEFAULT_COUNTRY_PLANS;
}

export async function getCountryPlans(countryCode?: string): Promise<Plan[]> {
  const code = (countryCode || "DO").toUpperCase();
  const all = await getAllCountryPlans();
  if (all[code] && all[code].length > 0) {
    return all[code];
  }
  if (DEFAULT_COUNTRY_PLANS[code]) {
    return DEFAULT_COUNTRY_PLANS[code];
  }
  // Generar con moneda del país si no existe en la lista previa
  const country = getCountry(code);
  const basePlans = DEFAULT_COUNTRY_PLANS["DO"].map((p) => ({
    ...p,
    pais_codigo: country.code,
    moneda_simbolo: country.currency.symbol,
    moneda_codigo: country.currency.code,
  }));
  return basePlans;
}

export async function saveCountryPlans(countryCode: string, plans: Plan[]): Promise<void> {
  const code = (countryCode || "DO").toUpperCase();
  const currentCfg = await getGlobalConfig();
  const existingMap = currentCfg.country_plans || currentCfg.bankDetails?.country_plans || DEFAULT_COUNTRY_PLANS;
  const updatedMap = {
    ...existingMap,
    [code]: plans,
  };
  await saveGlobalConfig({
    ...currentCfg,
    country_plans: updatedMap,
    bankDetails: {
      ...(currentCfg.bankDetails || {} as any),
      country_plans: updatedMap,
    },
  });
  invalidateGlobalConfigCache();
}

let _cachedPlans: Plan[] = PLANS;

export function getTenantPlan(tenant: Tenant | null, dynamicPlans?: Plan[]): Plan {
  if (dynamicPlans && dynamicPlans.length > 0) {
    if (!tenant) return dynamicPlans[0];
    return dynamicPlans.find((p) => p.id === tenant.plan_id) || dynamicPlans[0];
  }
  const countryCode = (tenant?.pais_codigo || "DO").toUpperCase();
  const list = DEFAULT_COUNTRY_PLANS[countryCode] || DEFAULT_COUNTRY_PLANS["DO"] || PLANS;
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
    | "pos_offline"
    | "promociones"
    | "nomina"
    | "cxp",
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
  if (moduleKey === "promociones") {
    return activePlan?.modulos?.promociones !== undefined
      ? !!activePlan.modulos.promociones
      : false;
  }
  if (moduleKey === "nomina") {
    return activePlan?.modulos?.nomina !== undefined
      ? !!activePlan.modulos.nomina
      : false;
  }
  if (moduleKey === "cxp") {
    return activePlan?.modulos?.cxp !== undefined
      ? !!activePlan.modulos.cxp
      : false;
  }
  return !!activePlan?.modulos?.[moduleKey];
}

export const DEFAULT_CONFIG: TenantConfig = {
  pais_codigo: "DO",
  moneda_simbolo: "RD$",
  moneda_codigo: "DOP",
  impuesto_nombre: "ITBIS",
  impuesto_porcentaje: 18,
  documento_fiscal_label: "RNC",
  nombre_sucursal: "Sucursal principal",
  cobrar_impuesto: true,
  itbis_incluido: false,
  itbis_porcentaje: 18,
  mostrar_columna_itbis: true,
  formato_ticket: "80mm",
  ticket_prefijo_orden: "KL",
  ticket_formato_numero: "estandar",
  impresora_tipo: "usb",
  impresora_perfil: "basica",
  impresora_serial_baud: 9600,
  impresora_nombre: "POS80 Printer",
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
  pos_modalidad_operativa: "FLEXIBLE",
  pos_auto_imprimir: true,
  ticket_imprimir_taller_auto: false,
  ticket_taller_solo_con_ubicacion: false,
  ticket_imprimir_copia_caja: false,
  ticket_imprimir_marquillas_auto: false,
  habilitar_control_marbetes: false,
  bloqueo_inactividad_minutos: 0,
  descuento_cliente_activo: true,
  whatsapp_web_manual: true,
  prendas_excluidas_muestra: [],
  servicios_excluidos_muestra: [],
  control_terminales_activo: false,
  terminales_autorizadas: [],
  solicitudes_vinculacion: [],
  control_horario_activo: false,
  horario_apertura: "08:00",
  horario_cierre: "19:30",
  dias_laborables: [1, 2, 3, 4, 5, 6],
  margen_gracia_minutos: 30,
  impedir_sesiones_simultaneas: false,
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
🧾 *{ncf_label}:* {ncf}
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
{ticket_nota}

📲 *¿Deseas que te avisemos por este mismo chat tan pronto tu ropa esté 100% lista para retirar? Responde "SÍ" para confirmarlo.*

💡 _Por favor guarda nuestro contacto en tu celular para recibir las alertas._
`,
    plantilla_lista:
      "Hola 👋, {cliente} ✨. Tu orden {numero} de:\n\n{detalle}\n\nEn *{lavanderia}* ya está LISTA para retirar.\n\n🚗 *¿Pasarás a retirar hoy? Responde \"HOY\" para tener tus prendas a mano en el mostrador o \"MAÑANA\".*\n\n💡 _Recuerda guardar nuestro número para avisos de tus prendas._\n",
    plantilla_entregada:
      "Hola 👋, {cliente}. Tu orden {numero} fue entregada con éxito. ¡Gracias por confiar en *{lavanderia}*! ✨\n\n⭐ *Del 1 al 5, ¿qué tal quedó tu ropa hoy? Responde con tu puntuación (ej: \"5\"). ¡Tu opinión nos ayuda a mejorar!*\n",
    plantilla_sin_retirar:
      "Hola 👋, {cliente}. Te recordamos que tu orden {numero} de:\n\n{detalle}\n\nLleva {dias} días lista en *{lavanderia}*. Saldo pendiente: {saldo}.\n\n📅 *¿Qué día estimas pasar a retirarla? Responde con el día (ej: \"VIERNES\") para mantenerla protegida en almacén.*\n\n📍 Te esperamos en {lavanderia_dir}.\n",
    plantilla_en_camino:
      "¡Tu orden va en camino! 🛵\n\nHola {cliente}, te informamos que tu orden #{numero} ya salió de *{lavanderia}* y va de camino a tu dirección:\n\n📍 {cliente_dir}\n\n⏱️ *¿Estarás disponible para recibir en los próximos 20 minutos? Responde \"SÍ\" o \"NO\" para coordinar con el chofer.*\n",
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
  { id: "editar-orden", nombre: "Editar órdenes", descripcion: "Corregir órdenes abiertas con motivo e historial de cambios" },
  {
    id: "control-marbetes",
    nombre: "Control de Marbetes",
    descripcion: "Tiras hidrofix y secuencias físicas",
  },
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
  {
    id: "autorizar-credito",
    nombre: "Autorizar Crédito Excedido",
    descripcion: "Permitir crear órdenes a crédito que sobrepasen el límite fijado al cliente",
  },
  {
    id: "cxp",
    nombre: "Cuentas por Pagar",
    descripcion: "Facturas de compras, suplidores y pagos a crédito",
  },
  {
    id: "nomina",
    nombre: "Nómina de Empleados",
    descripcion: "Gestión de salarios, períodos de nómina, recibos y vales",
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
        "control-marbetes",
        "procesos",
        "caja",
        "clientes",
        "catalogo",
        "logistica",
        "gastos",
        "reportes",
        "cxp",
        "nomina",
      ];
    case "VENDEDOR":
      return ["dashboard", "nueva-orden", "ordenes", "procesos", "caja", "clientes"];
    case "RECEPCIONISTA":
      return ["nueva-orden", "clientes", "ordenes", "control-marbetes", "procesos"];
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
  if (!isBrowser()) return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (err: any) {
    // Si la cuota de localStorage se llenó, purgar cachés pesadas prescindibles
    if (err?.name === "QuotaExceededError" || err?.code === 22 || err?.number === -2147024882) {
      try {
        const prescindibleKeys = [
          KEY.ordenes,
          "klynn_last_parity_metrics",
          "klynn_admin_ecf_map",
        ];
        for (const pk of prescindibleKeys) {
          if (pk !== k) localStorage.removeItem(pk);
        }
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    } else {
      console.warn(`[storage] Aviso al guardar "${k}" en LocalStorage:`, err?.message || err);
    }
  }
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
      const mapped = data.map((p: any) => {
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
            promociones:
              p.promociones !== undefined && p.promociones !== null
                ? !!p.promociones
                : localMatch?.modulos?.promociones !== undefined
                  ? !!localMatch.modulos.promociones
                  : (staticMatch?.modulos?.promociones ?? false),
            nomina:
              p.nomina !== undefined && p.nomina !== null
                ? !!p.nomina
                : localMatch?.modulos?.nomina !== undefined
                  ? !!localMatch.modulos.nomina
                  : (staticMatch?.modulos?.nomina ?? false),
            cxp:
              p.cxp !== undefined && p.cxp !== null
                ? !!p.cxp
                : localMatch?.modulos?.cxp !== undefined
                  ? !!localMatch.modulos.cxp
                  : (staticMatch?.modulos?.cxp ?? false),
          },
          limite_whatsapp_mes:
            p.limite_whatsapp_mes !== undefined && p.limite_whatsapp_mes !== null
              ? Number(p.limite_whatsapp_mes)
              : localMatch?.limite_whatsapp_mes !== undefined && localMatch?.limite_whatsapp_mes !== null
                ? Number(localMatch.limite_whatsapp_mes)
                : (staticMatch?.limite_whatsapp_mes ?? 0),
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

async function ensureLogoUploadedToStorage(tenantId: string, logoUrl?: string): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.startsWith("data:")) return logoUrl;
  if (typeof window === "undefined" || !navigator.onLine) return logoUrl;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "webp";
    const filePath = `logos/${tenantId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("catalogo")
      .upload(filePath, blob, { contentType: blob.type, upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("catalogo").getPublicUrl(filePath);
      return data.publicUrl;
    }
  } catch (e) {
    console.warn("No se pudo migrar base64 a storage:", e);
  }
  return logoUrl;
}

export async function saveTenant(t: Tenant) {
  const realId = resolveTenantId(t.id);
  const finalLogoUrl = await ensureLogoUploadedToStorage(realId, t.logo_url);
  const branchName = t.nombre_sucursal || t.config?.nombre_sucursal || "Sucursal principal";
  const updatedTenant: Tenant = {
    ...t,
    id: realId,
    logo_url: finalLogoUrl,
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
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant?.id === realId || parsed?.tenant?.slug === updatedTenant.slug) {
          parsed.tenant = updatedTenant;
          localStorage.setItem("klynn_last_auth_user", JSON.stringify(parsed));
        }
      } catch {}
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

export async function saveTenantConfig(tenantId: string, config: Partial<TenantConfig>) {
  const realId = resolveTenantId(tenantId);

  // 1. Obtener la configuración previa acumulada de la caché y de Supabase para NUNCA pisar campos
  let baseConfig: TenantConfig = DEFAULT_CONFIG;
  const cacheKey = `klynn_tenant_id_${realId}`;
  let cachedTenant: Tenant | null = null;

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try {
        cachedTenant = JSON.parse(raw);
        if (cachedTenant?.config) baseConfig = { ...baseConfig, ...cachedTenant.config };
      } catch {}
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant?.config) baseConfig = { ...baseConfig, ...parsed.tenant.config };
      } catch {}
    }
  }

  // Si estamos online, consultar la configuración actual en Supabase para no pisar campos existentes
  if (typeof window !== "undefined" && navigator.onLine) {
    try {
      const { data: remoteData } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", realId)
        .maybeSingle();
      if (remoteData?.config && typeof remoteData.config === "object") {
        baseConfig = { ...baseConfig, ...remoteData.config };
      }
    } catch {}
  }

  const cleanConfig: TenantConfig = {
    ...baseConfig,
    ...config,
  };

  // 2. Actualizar caché local de inmediato para 0ms de respuesta y persistencia offline
  if (typeof window !== "undefined") {
    if (cachedTenant) {
      cachedTenant.config = cleanConfig;
      localStorage.setItem(cacheKey, JSON.stringify(cachedTenant));
      if (cachedTenant.slug) {
        localStorage.setItem(
          `klynn_tenant_cache_${cachedTenant.slug}`,
          JSON.stringify(cachedTenant),
        );
      }
    }
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant) {
          parsed.tenant.config = cleanConfig;
          localStorage.setItem("klynn_last_auth_user", JSON.stringify(parsed));
        }
      } catch {}
    }
  }

  // 3. Persistir en Supabase de forma garantizada vía Server Function (service_role)
  let savedViaServer = false;
  try {
    const res = await saveTenantConfigServer({ data: { tenantId: realId, config: cleanConfig } });
    if (res?.ok) {
      savedViaServer = true;
    }
  } catch (serverErr) {
    console.warn("Aviso: server function saveTenantConfigServer no disponible:", serverErr);
  }

  // Si falló la Server Function o estamos en cliente directo, intentar cliente Supabase
  if (!savedViaServer) {
    try {
      const { error } = await supabase.from("tenants").update({ config: cleanConfig }).eq("id", realId);
      if (error) {
        console.error("[saveTenantConfig] Error en update directo:", error);
        throw error;
      }
    } catch (err) {
      await offlineDB.addToOutbox({
        id: realId,
        tenant_id: realId,
        table_name: "tenants",
        action: "UPDATE",
        payload: { config: cleanConfig },
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("klynn-offline-save"));
      }
    }
  }

  // 4. Sincronizar también con la tabla dedicada 'horarios_laborales_sucursal'
  if (
    config.control_horario_activo !== undefined ||
    config.horario_apertura !== undefined ||
    config.horario_cierre !== undefined ||
    config.dias_laborables !== undefined
  ) {
    try {
      await supabase.from("horarios_laborales_sucursal").upsert(
        {
          tenant_id: realId,
          activo: cleanConfig.control_horario_activo || false,
          horario_apertura: cleanConfig.horario_apertura || "08:00:00",
          horario_cierre: cleanConfig.horario_cierre || "19:30:00",
          dias_laborables: cleanConfig.dias_laborables || [1, 2, 3, 4, 5, 6],
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      );
    } catch (e) {
      console.warn("Aviso: no se pudo sincronizar horarios_laborales_sucursal:", e);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("klynn-tenant-config-changed", { detail: cleanConfig }));
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
  const realTenantId = resolveTenantId(tenant.id);
  const finalLogoUrl = await ensureLogoUploadedToStorage(realTenantId, tenant.logo_url);
  const branchName = tenant.nombre_sucursal || "Sucursal principal";
  const tenantToSave: Tenant = {
    ...tenant,
    id: realTenantId,
    logo_url: finalLogoUrl,
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
    "gasto_plantillas",
    "gasto_categorias",
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

  // 1. Si ya está en caché local, usarlo inmediatamente en 0ms
  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        if (cached && (cached.slug === cleanSlug || cached.id)) {
          // Si estamos online, refrescar en segundo plano sin bloquear el render
          if (navigator.onLine) {
            supabase
              .from("tenants")
              .select("*")
              .eq("slug", cleanSlug)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  localStorage.setItem(cacheKey, JSON.stringify(data));
                  localStorage.setItem(`klynn_tenant_id_${data.id}`, JSON.stringify(data));
                }
              })
              .catch(() => {});
          }
          return cached;
        }
      } catch {}
    }
  }

  // 2. Intentar buscar en Supabase con timeout de seguridad (1.5s)
  try {
    const fetchPromise = supabase.from("tenants").select("*").eq("slug", cleanSlug).maybeSingle();

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 1500),
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

  // Fallback a Server Function nativa con timeout seguro (1.5s)
  try {
    const serverPromise = getTenantBySlugServer({ data: { slug: cleanSlug } });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1500),
    );
    const serverTenant = await Promise.race([serverPromise, timeoutPromise]);
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

  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        if (cached && cached.id === id) {
          if (navigator.onLine) {
            supabase
              .from("tenants")
              .select("*")
              .eq("id", id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  localStorage.setItem(cacheKey, JSON.stringify(data));
                  if (data.slug) localStorage.setItem(`klynn_tenant_cache_${data.slug}`, JSON.stringify(data));
                }
              })
              .catch(() => {});
          }
          return cached;
        }
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
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 1500),
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

  // Fallback a Server Function nativa (service_role garantizado sin RLS)
  try {
    const serverPromise = getTenantByIdServer({ data: { tenantId: id } });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1500),
    );
    const serverTenant = await Promise.race([serverPromise, timeoutPromise]);
    if (serverTenant) {
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(serverTenant));
        if (serverTenant.slug)
          localStorage.setItem(`klynn_tenant_cache_${serverTenant.slug}`, JSON.stringify(serverTenant));
      }
      return serverTenant as Tenant;
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

export async function updateTenantSubscriptionBilling(
  tenantId: string,
  autoRenovacion: boolean,
  planFechaInicio?: string,
  trialHasta?: string,
  resetOrders = false,
): Promise<boolean> {
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();

  const nowIso = new Date().toISOString();
  const currentConfig = tenant?.config || {};
  const nextConfig: TenantConfig = {
    ...currentConfig,
    auto_renovacion: autoRenovacion,
    plan_fecha_inicio: planFechaInicio || currentConfig.plan_fecha_inicio,
    ...(resetOrders ? { ordenes_reset_at: nowIso } : {}),
  };

  const updates: Record<string, any> = {
    config: nextConfig,
    auto_renovacion: autoRenovacion,
  };

  if (planFechaInicio) {
    updates.plan_fecha_inicio = planFechaInicio;
  }
  if (trialHasta) {
    updates.trial_hasta = trialHasta;
  }

  const { error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", tenantId);

  if (error) {
    console.warn("Retrying tenant billing update without top-level auto_renovacion column if missing:", error);
    delete updates.auto_renovacion;
    const { error: fallbackError } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", tenantId);

    if (fallbackError) {
      console.error("Error updating tenant subscription billing fallback:", fallbackError);
      return false;
    }
  }

  return true;
}

export async function resetTenantMonthlyOrderCount(tenantId: string): Promise<boolean> {
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("config")
    .eq("id", tenantId)
    .single();

  const nowIso = new Date().toISOString();
  const currentConfig = tenant?.config || {};
  const nextConfig: TenantConfig = {
    ...currentConfig,
    ordenes_reset_at: nowIso,
    plan_fecha_inicio: nowIso,
  };

  const { error } = await supabase
    .from("tenants")
    .update({ 
      config: nextConfig,
      plan_fecha_inicio: nowIso
    })
    .eq("id", tenantId);

  if (error) {
    console.error("Error resetting tenant monthly orders:", error);
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
  klynn_connect_url: "https://wa.klynncloud.com",
  klynn_connect_apikey: "klynn_evolution_secret_key_2026",
  meta_app_id: "",
  meta_config_id: "",
  fiscal_environment_policy: "per_tenant",
  standby_sync_frequency: "2h",
  standby_last_sync_status: "OK",
  standby_last_sync_duration: "14s",
};

let cachedGlobalConfig: { data: GlobalConfig; expiresAt: number } | null = null;

export function invalidateGlobalConfigCache() {
  cachedGlobalConfig = null;
}

export async function getGlobalConfig(): Promise<GlobalConfig> {
  if (cachedGlobalConfig && cachedGlobalConfig.expiresAt > Date.now()) {
    return cachedGlobalConfig.data;
  }
  try {
    const { data, error } = await supabase
      .from("global_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      const bank = data.bank_details ?? data.bankDetails;
      const resConfig: GlobalConfig = {
        requirePlanOnRegistration:
          data.require_plan_on_registration ??
          data.requirePlanOnRegistration ??
          DEFAULT_GLOBAL_CONFIG.requirePlanOnRegistration,
        trialDays: data.trial_days ?? data.trialDays ?? DEFAULT_GLOBAL_CONFIG.trialDays,
        defaultPlanId:
          data.default_plan_id ?? data.defaultPlanId ?? DEFAULT_GLOBAL_CONFIG.defaultPlanId,
        bankDetails: bank,
        country_plans: bank?.country_plans || (data as any)?.country_plans || DEFAULT_COUNTRY_PLANS,
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
        meta_app_id:
          bank?.meta_app_id ??
          (data as any)?.meta_app_id ??
          DEFAULT_GLOBAL_CONFIG.meta_app_id,
        meta_config_id:
          bank?.meta_config_id ??
          (data as any)?.meta_config_id ??
          DEFAULT_GLOBAL_CONFIG.meta_config_id,
        meta_app_secret:
          bank?.meta_app_secret ??
          (data as any)?.meta_app_secret ??
          "",
        neuroapi_master_api_key:
          bank?.neuroapi_master_api_key ??
          (data as any)?.neuroapi_master_api_key ??
          "",
        neuroapi_enabled:
          bank?.neuroapi_enabled ??
          (data as any)?.neuroapi_enabled ??
          false,
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
      cachedGlobalConfig = { data: resConfig, expiresAt: Date.now() + 60000 };
      return resConfig;
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
      country_plans: config.country_plans || config.bankDetails?.country_plans || DEFAULT_COUNTRY_PLANS,
      require_employee_otp: config.requireEmployeeOtp ?? false,
      whatsapp_engine: config.whatsapp_engine || "klynn_connect",
      klynn_connect_url: config.klynn_connect_url || "https://wa.klynncloud.com",
      klynn_connect_apikey: config.klynn_connect_apikey || "klynn_evolution_secret_key_2026",
      meta_app_id: config.meta_app_id || "",
      meta_config_id: config.meta_config_id || "",
      meta_app_secret: config.meta_app_secret || "",
      neuroapi_master_api_key: config.neuroapi_master_api_key || "",
      neuroapi_enabled: config.neuroapi_enabled ?? (config.whatsapp_engine === "neuroapi"),
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
    invalidateGlobalConfigCache();
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.klynncloud.com";
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

  if (empleado.rol === "ADMIN") {
    empleado.permisos = PERMISOS_SISTEMA.map((p) => p.id);
    empleado.max_descuento_porcentaje = 100;
  }

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
      : "https://klynncloud.com/restablecer-contrasena?invitation=1";
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



// Helper to ensure ADMIN always has 100% of system permissions and full discount
function normalizeEmpleados(list: Empleado[]): Empleado[] {
  const allPermIds = PERMISOS_SISTEMA.map((p) => p.id);
  return list.map((emp) => {
    if (emp && emp.rol === "ADMIN") {
      return {
        ...emp,
        permisos: allPermIds,
        max_descuento_porcentaje: 100,
      };
    }
    return emp;
  });
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
        if (Array.isArray(parsed) && parsed.length > 0) return normalizeEmpleados(parsed);
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
          return normalizeEmpleados([parsed.empleado]);
        }
      } catch {}
    }
    const local = read<Empleado[]>(KEY.empleados, []);
    if (tenant_id) return normalizeEmpleados(local.filter((e) => isSameTenant(e.tenant_id, tenant_id)));
    return normalizeEmpleados(local);
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
      const normalized = normalizeEmpleados(data);
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(normalized));
      }
      write(KEY.empleados, normalized);
      return normalized;
    }
  } catch (e) {
    console.warn("Aviso al obtener empleados de Supabase:", e);
  }

  // 3. Fallback a caché
  if (typeof window !== "undefined") {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed)) return normalizeEmpleados(parsed);
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
          return normalizeEmpleados([parsed.empleado]);
        }
      } catch {}
    }
  }

  const local = read<Empleado[]>(KEY.empleados, []);
  if (tenant_id) return normalizeEmpleados(local.filter((e) => isSameTenant(e.tenant_id, tenant_id)));
  return normalizeEmpleados(local);
}

export async function saveEmpleado(e: Empleado) {
  if (e.rol === "ADMIN") {
    e.permisos = PERMISOS_SISTEMA.map((p) => p.id);
    e.max_descuento_porcentaje = 100;
  }
  let authErrorMsg = "";
  const emailLower = e.email.toLowerCase().trim();
  const rawPassword = e.password;

  console.log("Iniciando guardado de empleado:", { email: emailLower, id: e.id });

  // 1. Intentar persistencia robusta vía Server Function con credenciales maestras
  try {
    const res = await saveEmployeeServer({
      data: {
        empleado: e,
        password: rawPassword && rawPassword !== "***" ? rawPassword : undefined,
      },
    });

    if (res && res.ok && res.empleado) {
      const dataToSave = res.empleado as Empleado;
      if (typeof window !== "undefined") {
        const cacheKey = `klynn_emp_id_${dataToSave.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(dataToSave));
        const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
        if (lastAuthStr) {
          try {
            const parsed = JSON.parse(lastAuthStr);
            if (
              parsed?.empleado &&
              (parsed.empleado.id === dataToSave.id || parsed.empleado.email?.toLowerCase() === emailLower)
            ) {
              parsed.empleado = { ...parsed.empleado, ...dataToSave };
              localStorage.setItem("klynn_last_auth_user", JSON.stringify(parsed));
              window.dispatchEvent(new CustomEvent("klynn-auth-user-changed", { detail: parsed.empleado }));
            }
          } catch {}
        }
      }
      return dataToSave;
    } else if (res && !res.ok) {
      console.warn("Aviso en saveEmployeeServer:", res.error);
      if (res.error?.includes("contraseña") || res.error?.includes("password") || res.error?.includes("correo")) {
        throw new Error(res.error);
      }
    }
  } catch (serverErr: any) {
    console.warn("Fallo o fallback en saveEmployeeServer:", serverErr);
    if (serverErr.message?.includes("contraseña") || serverErr.message?.includes("correo")) {
      throw serverErr;
    }
  }

  // 0. Registrar o sincronizar en Supabase Auth
  let isNew = false;

  // Buscar si el empleado ya existe en la base de datos por ID o por Email
  const { data: existingById } = e.id && !e.id.startsWith("emp_")
    ? await supabase.from("empleados").select("id, email").eq("id", e.id).maybeSingle()
    : { data: null };

  const { data: existingByEmail } = await supabase
    .from("empleados")
    .select("id, email")
    .eq("email", emailLower)
    .maybeSingle();

  const existingRecord = existingById || existingByEmail;

  if (existingRecord) {
    // Si ya existe el registro, NO ES UN EMPLEADO NUEVO -> ES UNA EDICIÓN / ACTUALIZACIÓN
    isNew = false;
    e.id = existingRecord.id;
  } else {
    isNew = true;
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
          console.warn("Usuario ya existe en Auth, procediendo con la actualización en empleados...");
          if (existingByEmail) {
            e.id = existingByEmail.id;
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
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Caso especial: El usuario se actualiza a sí mismo
      if (currentUser && currentUser.id === e.id) {
        if (e.password && e.password.length >= 6 && e.password !== "***") {
          console.log("Auto-actualización de contraseña...");
          const { error: updateError } = await supabase.auth.updateUser({ password: e.password });
          if (updateError) {
            const msg = updateError.message.toLowerCase();
            if (msg.includes("different from the old password") || msg.includes("same as the old")) {
              // Si la contraseña ingresada es la misma que ya tenía, no bloqueamos el guardado del perfil ni del PIN
              console.log("La contraseña ingresada es idéntica a la actual. Se conserva sin cambios.");
            } else if (msg.includes("at least 6 characters")) {
              authErrorMsg = "La nueva contraseña debe tener al menos 6 caracteres.";
            } else {
              authErrorMsg = "Error al actualizar contraseña: La nueva contraseña debe ser diferente a la contraseña actual.";
            }
          }
        }

        if (currentUser.email?.toLowerCase() !== emailLower) {
          console.log("Auto-actualización de email...");
          const { error: emailError } = await supabase.auth.updateUser({ email: emailLower });
          if (emailError) {
            const emailMsg = emailError.message.toLowerCase();
            if (emailMsg.includes("already been registered") || emailMsg.includes("already registered")) {
              authErrorMsg =
                (authErrorMsg ? authErrorMsg + " " : "") +
                "El correo electrónico ya está registrado por otro usuario.";
            } else {
              authErrorMsg =
                (authErrorMsg ? authErrorMsg + " " : "") +
                "Error al actualizar correo: " +
                emailError.message;
            }
          }
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
  let { error: dbError } = await supabase.from("empleados").upsert(dataToSave);

  if (dbError && (dbError.message?.includes("metodo_pago") || (dbError as any).code === "PGRST204")) {
    const { metodo_pago, ...fallbackData } = dataToSave as any;
    const retry = await supabase.from("empleados").upsert(fallbackData);
    dbError = retry.error;
  }

  if (dbError) {
    console.error("DB ERROR:", dbError);
    throw new Error("Error DB: " + dbError.message);
  }

  // 3. Sincronizar con la sesión local activa si el empleado actualizado es el que está en sesión
  if (typeof window !== "undefined") {
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (
          parsed?.empleado &&
          (parsed.empleado.id === e.id || parsed.empleado.email?.toLowerCase() === emailLower)
        ) {
          parsed.empleado = { ...parsed.empleado, ...dataToSave };
          localStorage.setItem("klynn_last_auth_user", JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent("klynn-auth-user-changed", { detail: parsed.empleado }));
        }
      } catch {}
    }
  }

  if (authErrorMsg) throw new Error(authErrorMsg);
  console.log("GUARDADO COMPLETADO EXITOSAMENTE");
}

export async function deleteEmpleado(id: string) {
  try {
    const res = await deleteEmployeeServer({ data: { id } });
    if (res?.ok) {
      return;
    }
    if (res?.error) {
      console.warn("deleteEmployeeServer avisó:", res.error);
    }
  } catch (serverErr) {
    console.warn("Aviso deleteEmployeeServer fallback:", serverErr);
  }

  // Fallback si corre en frontend directo: neutralizar trigger legacy de DB antes de borrar
  try {
    await supabase
      .from("empleados")
      .update({ email: `temp_del_${Date.now()}_${id.slice(0, 8)}@klynn.internal` })
      .eq("id", id);
  } catch (updErr) {
    console.warn("Aviso al neutralizar email de empleado:", updErr);
  }

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

  try {
    const idbClientes = await offlineDB.getAll<Cliente>("clientes", realId);
    if (idbClientes && idbClientes.length > 0) {
      return idbClientes.filter(
        (c) => isSameTenant(c.tenant_id, tenant_id) || isSameTenant(c.tenant_id, realId),
      );
    }
  } catch {}

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
    if (error) {
      if (error.code === "42703" && "descuento_fijo" in c) {
        const { descuento_fijo: _, ...rest } = c;
        const { error: retryError } = await supabase.from("clientes").upsert(rest);
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }
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

  // 2. Buscar en Supabase con paginación automática y reintento resiliente
  try {
    const PAGE_SIZE = 1000;
    let allData: Orden[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let result = await supabase
        .from("ordenes")
        .select("*")
        .eq("tenant_id", realId)
        .order("creado_en", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      // Reintento silencioso en caso de fallo momentáneo de red / HTTP2 ping
      if (result.error) {
        await new Promise((r) => setTimeout(r, 400));
        result = await supabase
          .from("ordenes")
          .select("*")
          .eq("tenant_id", realId)
          .order("creado_en", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
      }

      const { data, error } = result;

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

    if (isBrowser()) {
      const allLocal = read<Orden[]>(KEY.ordenes, []);
      const otherTenants = allLocal.filter(
        (o) => !isSameTenant(o.tenant_id, tenant_id) && !isSameTenant(o.tenant_id, realId),
      );
      let pendingLocal: Orden[] = [];
      try {
        const outbox = await offlineDB.getOutboxItems(realId);
        const pendingIds = new Set(
          outbox
            .filter((item) => item.table_name === "ordenes" && item.status !== "synced")
            .map((item) => item.entity_id),
        );
        if (pendingIds.size > 0) {
          pendingLocal = allLocal.filter(
            (o) =>
              (isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId)) &&
              pendingIds.has(o.id) &&
              !allData.some((remote) => remote.id === o.id),
          );
        }
      } catch {}

      const combined = [...allData, ...pendingLocal];
      const sorted = [...combined].sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
      // Guardar en localStorage solo las órdenes recientes por sucursal para inicio instantáneo
      // El historial completo (1,500+ órdenes) se persiste en IndexedDB sin riesgo de agotar la cuota de 5MB
      const recentForLocalStorage = sorted.slice(0, 50);
      write(KEY.ordenes, [...otherTenants, ...recentForLocalStorage]);
      try {
        const existingIdb = await offlineDB.getAll<Orden>("ordenes", realId);
        const activeIds = new Set(sorted.map((o) => o.id));
        for (const old of existingIdb) {
          if (!activeIds.has(old.id)) {
            await offlineDB.delete("ordenes", old.id);
          }
        }
        await offlineDB.putMany("ordenes", sorted);
      } catch {}
      return sorted;
    }
    return allData;
  } catch (e) {
    // Fallback silencioso a almacenamiento local e IndexedDB
  }

  // Priorizar IndexedDB en fallback, ya que contiene el historial completo sin límite de cuota
  try {
    const idb = await offlineDB.getAll<Orden>("ordenes", realId);
    if (idb && idb.length > 0) {
      return idb
        .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
        .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
    }
  } catch {}

  const localFallback = read<Orden[]>(KEY.ordenes, [])
    .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
    .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));

  if (localFallback.length > 0) return localFallback;

  try {
    const idb = await offlineDB.getAll<Orden>("ordenes");
    if (idb && idb.length > 0) {
      return idb
        .filter((o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId))
        .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
    }
  } catch {}

  return [];
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

  const isValidUUID =
    typeof o.ecf_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o.ecf_id);
  const dbPayload = {
    ...o,
    ecf_id: isValidUUID ? o.ecf_id : null,
  };

  // 2. Si estamos sin conexión, agregar directamente a la cola Outbox
  if (typeof window !== "undefined" && !navigator.onLine) {
    await offlineDB.addToOutbox({
      id: o.id,
      tenant_id: o.tenant_id,
      table_name: "ordenes",
      action: "UPSERT",
      payload: dbPayload,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return;
  }

  // 3. Intentar guardar en Supabase; si falla por timeout o corte, encolar en Outbox
  try {
    let { error } = await supabase.from("ordenes").upsert(dbPayload);

    // Si la base de datos remota aún no tiene una columna recién creada (ej. 'marbetes' antes de correr la migración SQL),
    // omitir esa columna específica y reintentar para no detener las ventas ni bloquear la caja registradora.
    if (error && typeof error.message === "string") {
      const colMatch = error.message.match(/Could not find the '([^']+)' column of 'ordenes'/i);
      if (colMatch && colMatch[1]) {
        const missingCol = colMatch[1];
        console.warn(
          `[saveOrden] La columna '${missingCol}' no existe aún en la tabla 'ordenes' de Supabase. Reintentando guardado sin esta columna para no interrumpir la venta...`,
          error
        );
        const fallbackPayload = { ...(dbPayload as Record<string, any>) };
        delete fallbackPayload[missingCol];
        const retry = await supabase.from("ordenes").upsert(fallbackPayload);
        error = retry.error;
      }
    }

    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : String((err as any)?.message || err || "");
    const isConnectivityError =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      /failed to fetch|networkerror|network request|load failed|timeout|timed out|connection|fetch failed/i.test(message);

    if (isConnectivityError) {
      console.warn("Offline outbox fallback for orden:", err);
      await offlineDB.addToOutbox({
        id: o.id,
        tenant_id: o.tenant_id,
        table_name: "ordenes",
        action: "UPSERT",
        payload: dbPayload,
      });
      window.dispatchEvent(new CustomEvent("klynn-offline-save"));
      return;
    }

    // Schema, validation and permission errors are not offline conditions.
    // Propagate them so the order flow stops and always releases its loader.
    throw err;
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

export async function nextOrdenNumero(
  tenant_id: string,
  options?: { prefijo?: string; formato?: "estandar" | "corto" },
): Promise<string> {
  const realId = resolveTenantId(tenant_id);
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;

  // 0. Resolver prefijo y formato configurados para el negocio
  let prefijo = (options?.prefijo || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  let formato = options?.formato;

  if (!prefijo || !formato) {
    try {
      if (typeof window !== "undefined") {
        const cachedStr = localStorage.getItem(`klynn_tenant_id_${realId}`);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (!prefijo && parsed?.config?.ticket_prefijo_orden) {
            prefijo = String(parsed.config.ticket_prefijo_orden).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
          }
          if (!formato && parsed?.config?.ticket_formato_numero) {
            formato = parsed.config.ticket_formato_numero;
          }
        }
      }
    } catch {}
  }

  // Fallback a getTenantById si aún no se resuelve
  if (!prefijo || !formato) {
    try {
      const t = await getTenantById(realId);
      if (t?.config) {
        if (!prefijo && t.config.ticket_prefijo_orden) {
          prefijo = String(t.config.ticket_prefijo_orden).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        }
        if (!formato && t.config.ticket_formato_numero) {
          formato = t.config.ticket_formato_numero;
        }
      }
    } catch {}
  }

  if (!prefijo) prefijo = "KL";
  if (!formato) formato = "estandar";

  const buildNumber = (next: number) => {
    const pad = String(next).padStart(4, "0");
    return formato === "corto" ? `${prefijo}-${pad}` : `${prefijo}-${ym}-${pad}`;
  };

  // 0. Refrescar sesión de Supabase si está por expirar
  await ensureFreshSupabaseSession().catch(() => {});

  // 1. Recopilar números locales existentes (localStorage y IndexedDB outbox)
  const localSeqs: number[] = [];
  try {
    const local = read<Orden[]>(KEY.ordenes, []).filter(
      (o) => isSameTenant(o.tenant_id, tenant_id) || isSameTenant(o.tenant_id, realId),
    );
    for (const o of local) {
      const n = extractOrderSequenceNumber(o.numero);
      if (n) localSeqs.push(n);
    }
  } catch {}

  try {
    if (typeof window !== "undefined") {
      const outbox = await offlineDB.getPendingOutbox(realId);
      for (const item of outbox) {
        if (item.table_name === "ordenes" && item.payload?.numero) {
          const n = extractOrderSequenceNumber(item.payload.numero);
          if (n) localSeqs.push(n);
        }
      }
    }
  } catch {}

  // 2. Si no hay conexión a internet, resolver con las secuencias locales
  if (typeof window !== "undefined" && !navigator.onLine) {
    const next = computeNextOrderSequence(localSeqs);
    return buildNumber(next);
  }

  // 3. Consultar la base de datos en Supabase para obtener las órdenes recientes del tenant
  try {
    const { data, error } = await supabase
      .from("ordenes")
      .select("numero")
      .eq("tenant_id", realId)
      .order("creado_en", { ascending: false })
      .limit(1000);

    const remoteSeqs: number[] = [];
    if (!error && data && data.length > 0) {
      for (const row of data) {
        const n = extractOrderSequenceNumber(row.numero);
        if (n) remoteSeqs.push(n);
      }
    }

    const allSeqs = remoteSeqs.length > 0 ? [...remoteSeqs, ...localSeqs] : localSeqs;
    const next = computeNextOrderSequence(allSeqs);
    return buildNumber(next);
  } catch (e) {
    const next = computeNextOrderSequence(localSeqs);
    return buildNumber(next);
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
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6000),
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
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6000),
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

  // 2. Intentar buscar en Supabase con timeout prudente de 6000ms
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
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const localCajas = read<Caja[]>(KEY.cajas, []);
      if (data.length > 0) {
        const active = data[0];
        // Sincronizar memoria local asegurando que solo esta caja esté ABIERTA para este tenant
        const updatedLocal = localCajas.map((c) => {
          if ((c.tenant_id === realId || c.tenant_id === tenant_id) && c.id !== active.id && c.estado === "ABIERTA") {
            return { ...c, estado: "CERRADA" as const };
          }
          return c;
        });
        const idx = updatedLocal.findIndex((c) => c.id === active.id);
        if (idx >= 0) updatedLocal[idx] = active;
        else updatedLocal.unshift(active);
        write(KEY.cajas, updatedLocal);
        try {
          offlineDB.put("cajas", active);
        } catch {}
        return active;
      } else {
        // Supabase confirmó explícitamente que NO hay caja abierta para este tenant
        let changed = false;
        const updatedLocal = localCajas.map((c) => {
          if ((c.tenant_id === realId || c.tenant_id === tenant_id) && c.estado === "ABIERTA") {
            changed = true;
            return { ...c, estado: "CERRADA" as const };
          }
          return c;
        });
        if (changed) {
          write(KEY.cajas, updatedLocal);
        }
        return null;
      }
    }
  } catch (e) {
    console.warn("[getCajaAbierta] Error o timeout consultando Supabase:", e);
  }

  // 3. Fallback a memoria local únicamente si Supabase falló de red o dio timeout
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
    const filtered = local.filter(
      (m) =>
        (m.tenant_id === realId || m.tenant_id === tenant_id) &&
        (!caja_id || m.caja_id === caja_id),
    );
    if (filtered.length > 0) return filtered;
    try {
      const idb = await offlineDB.getAll<MovimientoCaja>("movimientos_caja");
      if (idb && idb.length > 0) {
        return idb.filter(
          (m) =>
            (m.tenant_id === realId || m.tenant_id === tenant_id) &&
            (!caja_id || m.caja_id === caja_id),
        );
      }
    } catch {}
    return filtered;
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
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6000),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const local = read<MovimientoCaja[]>(KEY.movimientos, []);
      // Los movimientos son inmutables. Conservamos los que todavía existen
      // solo localmente (por ejemplo, un reembolso en la cola offline) y los
      // combinamos con la respuesta del servidor para que /caja no los oculte.
      const serverIds = new Set(data.map((m: MovimientoCaja) => m.id));
      const pendingLocal = local.filter(
        (m) =>
          (m.tenant_id === realId || m.tenant_id === tenant_id) &&
          (!caja_id || m.caja_id === caja_id) &&
          !serverIds.has(m.id),
      );
      const merged = [...data, ...pendingLocal].sort(
        (a, b) => +new Date(b.creado_en) - +new Date(a.creado_en),
      );
      const otherMovs = local.filter((m) => m.tenant_id !== realId && m.tenant_id !== tenant_id);
      write(KEY.movimientos, [...merged, ...otherMovs]);
      try {
        offlineDB.putMany("movimientos_caja", data);
      } catch {}
      return merged;
    }
  } catch (e) {}

  const local = read<MovimientoCaja[]>(KEY.movimientos, []);
  return local
    .filter(
      (m) =>
        (m.tenant_id === realId || m.tenant_id === tenant_id) &&
        (!caja_id || m.caja_id === caja_id),
    )
    .sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
}

export async function saveMovimiento(m: MovimientoCaja) {
  const realId = resolveTenantId(m.tenant_id);
  const movToSave = { ...m, tenant_id: realId };

  // Protección anti-duplicidad: si es cobro o abono vinculado a orden, evitar duplicar el movimiento
  if (movToSave.orden_id && (movToSave.tipo === "VENTA" || movToSave.tipo === "ABONO")) {
    const localExisting = read<MovimientoCaja[]>(KEY.movimientos, []);
    const now = Date.now();

    // 1. Candado anti-rebote inmediato (< 15 segundos con mismos datos)
    const isRecentLocalDuplicate = localExisting.some((x) =>
      x.orden_id === movToSave.orden_id &&
      x.caja_id === movToSave.caja_id &&
      Number(x.monto) === Number(movToSave.monto) &&
      x.metodo === movToSave.metodo &&
      now - new Date(x.creado_en).getTime() < 15000
    );
    if (isRecentLocalDuplicate) {
      console.warn("[saveMovimiento] Descartado movimiento duplicado reciente (local):", movToSave);
      return;
    }

    // 2. Candado Contable: Verificar si la orden ya fue completamente cobrada en esta caja
    const localOrders = read<Orden[]>(KEY.ordenes, []);
    let targetOrden: Orden | null = localOrders.find((o) => o.id === movToSave.orden_id) || null;
    if (!targetOrden) {
      try {
        targetOrden = await offlineDB.get<Orden>("ordenes", movToSave.orden_id);
      } catch {}
    }

    if (targetOrden && Number(targetOrden.total) > 0) {
      const orderTotal = Number(targetOrden.total);
      const cobradoEnCaja = localExisting
        .filter(
          (x) =>
            x.orden_id === movToSave.orden_id &&
            x.caja_id === movToSave.caja_id &&
            (x.tipo === "VENTA" || x.tipo === "ABONO")
        )
        .reduce((sum, x) => sum + Number(x.monto || 0), 0);

      // Si ya se recaudó el 100% de la orden en esta caja, rechazar cualquier cobro nuevo
      if (cobradoEnCaja >= orderTotal) {
        console.warn(
          `[saveMovimiento] Cobro bloqueado: La orden ${movToSave.orden_id} ya recaudó ${cobradoEnCaja} de ${orderTotal} en esta caja.`
        );
        return;
      }
      if (cobradoEnCaja + Number(movToSave.monto) > orderTotal + 0.01) {
        console.warn(
          `[saveMovimiento] Cobro bloqueado: Monto ${movToSave.monto} excede el saldo pendiente de la orden (Total: ${orderTotal}, ya cobrado: ${cobradoEnCaja}).`
        );
        return;
      }
    }

    if (typeof window !== "undefined" && navigator.onLine) {
      try {
        const { data: serverMovs } = await supabase
          .from("movimientos_caja")
          .select("id, monto, tipo, creado_en")
          .eq("caja_id", movToSave.caja_id)
          .eq("orden_id", movToSave.orden_id)
          .in("tipo", ["VENTA", "ABONO"]);

        if (serverMovs && serverMovs.length > 0) {
          const isRecentServer = serverMovs.some(
            (sm) =>
              Number(sm.monto) === Number(movToSave.monto) &&
              now - new Date(sm.creado_en).getTime() < 15000
          );
          if (isRecentServer) {
            console.warn("[saveMovimiento] Descartado movimiento duplicado reciente (servidor):", movToSave);
            return;
          }

          let ordTotal = targetOrden ? Number(targetOrden.total) : null;
          if (!ordTotal) {
            const { data: srvOrd } = await supabase
              .from("ordenes")
              .select("total")
              .eq("id", movToSave.orden_id)
              .maybeSingle();
            if (srvOrd) ordTotal = Number(srvOrd.total);
          }

          if (ordTotal && ordTotal > 0) {
            const serverCobrado = serverMovs.reduce((acc, sm) => acc + Number(sm.monto || 0), 0);
            if (serverCobrado >= ordTotal || serverCobrado + Number(movToSave.monto) > ordTotal + 0.01) {
              console.warn(
                `[saveMovimiento] Descartado cobro que excede total en servidor: Cobrado: ${serverCobrado}, Total: ${ordTotal}`,
                movToSave
              );
              return;
            }
          }
        }
      } catch (errCheck) {
        console.warn("[saveMovimiento] Error al verificar duplicados en servidor:", errCheck);
      }
    }
  }

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
      let merged = data as Gasto[];

      // La respuesta remota todavia no contiene las mutaciones que estan en la
      // bandeja offline. Conservarlas evita que un gasto recien registrado
      // desaparezca de la tabla mientras Supabase termina de sincronizarlo.
      try {
        const pending = (await offlineDB.getOutboxItems(realId))
          .filter((item) => item.table_name === "gastos" && item.status !== "synced")
          .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
        const byId = new Map(merged.map((item) => [item.id, item]));
        for (const operation of pending) {
          if (operation.action === "DELETE") byId.delete(operation.entity_id);
          else if (operation.payload?.id)
            byId.set(operation.entity_id, operation.payload as Gasto);
        }
        merged = Array.from(byId.values()).sort(
          (a, b) => Date.parse(b.fecha) - Date.parse(a.fecha),
        );
      } catch {}

      const local = read<Gasto[]>(KEY.gastos, []);
      const otherGastos = local.filter((g) => g.tenant_id !== realId && g.tenant_id !== tenant_id);
      write(KEY.gastos, [...merged, ...otherGastos]);
      return merged;
    }
  } catch (e) {}

  return read<Gasto[]>(KEY.gastos, []).filter(
    (g) => g.tenant_id === realId || g.tenant_id === tenant_id,
  );
}

export async function saveGasto(g: Gasto): Promise<SaveGastoResult> {
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
    return {
      synced: false,
      queued: true,
      error: "Sin conexion. El gasto quedo pendiente de sincronizacion.",
    };
  }

  try {
    const { error } = await supabase.from("gastos").upsert(gastoToSave);
    if (error) throw error;
    return { synced: true, queued: false };
  } catch (err: any) {
    await offlineDB.addToOutbox({
      id: gastoToSave.id,
      tenant_id: realId,
      table_name: "gastos",
      action: "UPSERT",
      payload: gastoToSave,
    });
    window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    return {
      synced: false,
      queued: true,
      error: err?.message || "Supabase no pudo guardar el gasto.",
      errorCode: err?.code,
    };
  }
}

export async function deleteGasto(id: string, tenant_id?: string) {
  const local = read<Gasto[]>(KEY.gastos, []);
  const target = local.find((item) => item.id === id);
  const resolvedTenantId = resolveTenantId(tenant_id || target?.tenant_id || "");

  if (isBrowser())
    write(
      KEY.gastos,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("gastos", id);
    await offlineDB.removeOutboxForEntity("gastos", id, resolvedTenantId);
  } catch {}

  // Borrar movimientos vinculados en caja
  try {
    await supabase.from("movimientos_caja").delete().eq("referencia", id);
  } catch (e) {}

  if (typeof window !== "undefined" && !navigator.onLine) {
    if (resolvedTenantId) {
      await offlineDB.addToOutbox({
        entity_id: id,
        tenant_id: resolvedTenantId,
        table_name: "gastos",
        action: "DELETE",
        payload: { id, tenant_id: resolvedTenantId },
      });
    }
    return;
  }

  try {
    let q = supabase.from("gastos").delete().eq("id", id);
    if (resolvedTenantId) q = q.eq("tenant_id", resolvedTenantId);
    const { error } = await q;
    if (error) throw error;
  } catch (error) {
    if (resolvedTenantId) {
      await offlineDB.addToOutbox({
        entity_id: id,
        tenant_id: resolvedTenantId,
        table_name: "gastos",
        action: "DELETE",
        payload: { id, tenant_id: resolvedTenantId },
      });
    }
  }
}

const GASTO_CATEGORIAS_INICIALES = [
  { nombre: "Suministros", icono: "package", color: "teal" },
  { nombre: "Servicios básicos", icono: "zap", color: "amber" },
  { nombre: "Mantenimiento", icono: "wrench", color: "blue" },
  { nombre: "Alquiler", icono: "building", color: "rose" },
  { nombre: "Nómina y salarios", icono: "users", color: "indigo" },
  { nombre: "Transporte", icono: "truck", color: "orange" },
  { nombre: "Marketing", icono: "megaphone", color: "purple" },
  { nombre: "Oficina", icono: "file-text", color: "slate" },
  { nombre: "Otros", icono: "tag", color: "slate" },
] as const;

function buildInitialGastoCategories(tenantId: string): GastoCategoria[] {
  const now = new Date().toISOString();
  return GASTO_CATEGORIAS_INICIALES.map((item, index) => ({
    id: uid("gcat"),
    tenant_id: tenantId,
    nombre: item.nombre,
    icono: item.icono,
    color: item.color,
    activo: true,
    orden: index,
    creado_en: now,
    actualizado_en: now,
  }));
}

export async function getGastoCategorias(tenantId: string): Promise<GastoCategoria[]> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<GastoCategoria[]>(KEY.gastos_categorias, []);
  const local = allLocal.filter((item) => item.tenant_id === realId || item.tenant_id === tenantId);

  if (typeof window !== "undefined" && !navigator.onLine) {
    if (local.length > 0) return local.sort((a, b) => a.orden - b.orden);
    const seeded = buildInitialGastoCategories(realId);
    write(KEY.gastos_categorias, [...allLocal, ...seeded]);
    for (const item of seeded) {
      await offlineDB.addToOutbox({
        entity_id: item.id,
        tenant_id: realId,
        table_name: "gasto_categorias",
        action: "UPSERT",
        payload: item,
      });
    }
    return seeded;
  }

  try {
    const { data, error } = await supabase
      .from("gasto_categorias")
      .select("*")
      .eq("tenant_id", realId)
      .order("orden", { ascending: true });
    if (error) throw error;

    let remote = (data || []) as GastoCategoria[];
    if (remote.length === 0) {
      remote = buildInitialGastoCategories(realId);
      const { error: seedError } = await supabase.from("gasto_categorias").upsert(remote);
      if (seedError) throw seedError;
    }

    const others = allLocal.filter((item) => item.tenant_id !== realId && item.tenant_id !== tenantId);
    write(KEY.gastos_categorias, [...remote, ...others]);
    return remote;
  } catch (error) {
    console.warn("getGastoCategorias error, using local:", error);
    if (local.length > 0) return local.sort((a, b) => a.orden - b.orden);
    const seeded = buildInitialGastoCategories(realId);
    write(KEY.gastos_categorias, [...allLocal, ...seeded]);
    return seeded;
  }
}

export async function saveGastoCategoria(categoria: GastoCategoria): Promise<void> {
  const realId = resolveTenantId(categoria.tenant_id);
  const item = { ...categoria, tenant_id: realId, actualizado_en: new Date().toISOString() };
  const local = read<GastoCategoria[]>(KEY.gastos_categorias, []);
  const index = local.findIndex((row) => row.id === item.id);
  if (index >= 0) local[index] = item;
  else local.push(item);
  write(KEY.gastos_categorias, local);

  try {
    if (typeof window !== "undefined" && !navigator.onLine) throw new Error("offline");
    const { error } = await supabase.from("gasto_categorias").upsert(item);
    if (error) throw error;
  } catch {
    await offlineDB.addToOutbox({
      entity_id: item.id,
      tenant_id: realId,
      table_name: "gasto_categorias",
      action: "UPSERT",
      payload: item,
    });
  }
}

export async function deleteGastoCategoria(id: string, tenantId: string): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<GastoCategoria[]>(KEY.gastos_categorias, []);
  const next = allLocal.filter((item) => item.id !== id);
  write(KEY.gastos_categorias, next);

  try {
    await offlineDB.delete("gasto_categorias", id);
    await offlineDB.removeOutboxForEntity("gasto_categorias", id, realId);
  } catch {}

  try {
    if (typeof window !== "undefined" && !navigator.onLine) throw new Error("offline");
    const { error } = await supabase.from("gasto_categorias").delete().eq("id", id).eq("tenant_id", realId);
    if (error) throw error;
  } catch {
    await offlineDB.addToOutbox({
      entity_id: id,
      tenant_id: realId,
      table_name: "gasto_categorias",
      action: "DELETE",
      payload: { id, tenant_id: realId },
    });
  }
}

export async function getGastoPlantillas(tenantId: string): Promise<GastoPlantilla[]> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<GastoPlantilla[]>(KEY.gastos_plantillas, []);
  const local = allLocal.filter((item) => item.tenant_id === realId || item.tenant_id === tenantId);
  if (typeof window !== "undefined" && !navigator.onLine) return local;

  try {
    const { data, error } = await supabase
      .from("gasto_plantillas")
      .select("*")
      .eq("tenant_id", realId)
      .order("usos", { ascending: false })
      .order("nombre", { ascending: true });
    if (error) throw error;
    let remote = (data || []) as GastoPlantilla[];

    // Una plantilla pendiente de sincronizacion sigue siendo valida para el
    // usuario. Fusionarla con la respuesta remota evita que desaparezca justo
    // despues de usarla o editarla mientras la outbox termina de procesarla.
    try {
      const pending = (await offlineDB.getOutboxItems(realId))
        .filter((item) => item.table_name === "gasto_plantillas" && item.status !== "synced")
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const byId = new Map(remote.map((item) => [item.id, item]));
      for (const operation of pending) {
        if (operation.action === "DELETE") byId.delete(operation.entity_id);
        else if (operation.payload?.id)
          byId.set(operation.entity_id, operation.payload as GastoPlantilla);
      }
      remote = Array.from(byId.values()).sort(
        (a, b) => (b.usos || 0) - (a.usos || 0) || a.nombre.localeCompare(b.nombre),
      );
    } catch {}

    const others = allLocal.filter((item) => item.tenant_id !== realId && item.tenant_id !== tenantId);
    write(KEY.gastos_plantillas, [...remote, ...others]);
    return remote;
  } catch (error) {
    console.warn("getGastoPlantillas error, using local:", error);
    return local;
  }
}

export async function saveGastoPlantilla(plantilla: GastoPlantilla): Promise<void> {
  const realId = resolveTenantId(plantilla.tenant_id);
  const item = { ...plantilla, tenant_id: realId, actualizado_en: new Date().toISOString() };
  const local = read<GastoPlantilla[]>(KEY.gastos_plantillas, []);
  const index = local.findIndex((row) => row.id === item.id);
  if (index >= 0) local[index] = item;
  else local.push(item);
  write(KEY.gastos_plantillas, local);

  try {
    if (typeof window !== "undefined" && !navigator.onLine) throw new Error("offline");
    const { error } = await supabase.from("gasto_plantillas").upsert(item);
    if (error) throw error;
  } catch {
    await offlineDB.addToOutbox({
      entity_id: item.id,
      tenant_id: realId,
      table_name: "gasto_plantillas",
      action: "UPSERT",
      payload: item,
    });
  }
}

export async function archiveGastoPlantilla(id: string, tenantId: string): Promise<void> {
  const current = read<GastoPlantilla[]>(KEY.gastos_plantillas, []).find((item) => item.id === id);
  if (!current) return;
  await saveGastoPlantilla({ ...current, tenant_id: tenantId, activo: false });
}

// ============ Exclusiones de Muestra de Catálogo y Servicios ============
export function getTenantExclusions(tenantId: string): { prendas: Set<string>; servicios: Set<string> } {
  const realId = resolveTenantId(tenantId);
  const prendas = new Set<string>();
  const servicios = new Set<string>();

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (typeof window !== "undefined") {
    // 1. Probar caché por ID
    const raw = localStorage.getItem(`klynn_tenant_id_${realId}`);
    if (raw) {
      try {
        const t = JSON.parse(raw);
        (t?.config?.prendas_excluidas_muestra || []).forEach((x: string) => {
          if (x) {
            prendas.add(x.toLowerCase());
            prendas.add(normalize(x));
          }
        });
        (t?.config?.servicios_excluidos_muestra || []).forEach((x: string) => {
          if (x) {
            servicios.add(x.toLowerCase());
            servicios.add(normalize(x));
          }
        });
      } catch {}
    }
    // 2. Probar last_auth_user
    const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
    if (lastAuthStr) {
      try {
        const parsed = JSON.parse(lastAuthStr);
        if (parsed?.tenant?.config) {
          (parsed.tenant.config.prendas_excluidas_muestra || []).forEach((x: string) => {
            if (x) {
              prendas.add(x.toLowerCase());
              prendas.add(normalize(x));
            }
          });
          (parsed.tenant.config.servicios_excluidos_muestra || []).forEach((x: string) => {
            if (x) {
              servicios.add(x.toLowerCase());
              servicios.add(normalize(x));
            }
          });
        }
      } catch {}
    }
  }

  return { prendas, servicios };
}

export async function eliminarPrendaMuestra(
  tenantId: string,
  item: { id: string; nombre: string },
): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const idKey = item.id.toLowerCase();
  const nameKey = normalize(item.nombre);

  const tenant = await getTenantById(realId);
  const currentList = tenant?.config?.prendas_excluidas_muestra || [];
  const nextSet = new Set(currentList.map((x) => x.toLowerCase()));
  nextSet.add(idKey);
  nextSet.add(nameKey);
  const updatedList = Array.from(nextSet);

  await saveTenantConfig(realId, { prendas_excluidas_muestra: updatedList });

  const local = read<CatalogoItem[]>(KEY.catalogo, []);
  write(
    KEY.catalogo,
    local.filter((i) => i.id.toLowerCase() !== idKey && normalize(i.nombre) !== nameKey),
  );
  try {
    await offlineDB.delete("catalogo_prendas", item.id);
  } catch {}
}

export async function eliminarServicioMuestra(
  tenantId: string,
  servicio: { id: string; nombre: string },
): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const idKey = servicio.id.toLowerCase();
  const nameKey = normalize(servicio.nombre);

  const tenant = await getTenantById(realId);
  const currentList = tenant?.config?.servicios_excluidos_muestra || [];
  const nextSet = new Set(currentList.map((x) => x.toLowerCase()));
  nextSet.add(idKey);
  nextSet.add(nameKey);
  const updatedList = Array.from(nextSet);

  await saveTenantConfig(realId, { servicios_excluidos_muestra: updatedList });

  const local = read<Servicio[]>(KEY.servicios, []);
  write(
    KEY.servicios,
    local.filter((s) => s.id.toLowerCase() !== idKey && normalize(s.nombre) !== nameKey),
  );
  try {
    await offlineDB.delete("catalogo_servicios", servicio.id);
  } catch {}
}

export async function restaurarMuestras(
  tenantId: string,
  tipo: "prendas" | "servicios" | "todas" = "todas",
): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const updates: Partial<TenantConfig> = {};
  if (tipo === "prendas" || tipo === "todas") {
    updates.prendas_excluidas_muestra = [];
  }
  if (tipo === "servicios" || tipo === "todas") {
    updates.servicios_excluidos_muestra = [];
  }
  await saveTenantConfig(realId, updates);
}

export async function limpiarTodasLasMuestras(
  tenantId: string,
  tipo: "prendas" | "servicios" | "todas" = "todas",
  prendasActuales: CatalogoItem[] = [],
  serviciosActuales: Servicio[] = [],
): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const tenant = await getTenantById(realId);
  const updates: Partial<TenantConfig> = {};

  if (tipo === "prendas" || tipo === "todas") {
    const prendasMuestra = prendasActuales.filter((p) => p.es_muestra || p.tenant_id === "admin");
    const current = tenant?.config?.prendas_excluidas_muestra || [];
    const setP = new Set(current.map((x) => x.toLowerCase()));
    prendasMuestra.forEach((p) => {
      setP.add(p.id.toLowerCase());
      setP.add(normalize(p.nombre));
    });
    updates.prendas_excluidas_muestra = Array.from(setP);
  }

  if (tipo === "servicios" || tipo === "todas") {
    const serviciosMuestra = serviciosActuales.filter((s) => s.es_muestra || s.tenant_id === "admin");
    const current = tenant?.config?.servicios_excluidos_muestra || [];
    const setS = new Set(current.map((x) => x.toLowerCase()));
    serviciosMuestra.forEach((s) => {
      setS.add(s.id.toLowerCase());
      setS.add(normalize(s.nombre));
    });
    updates.servicios_excluidos_muestra = Array.from(setS);
  }

  await saveTenantConfig(realId, updates);
}

// ============ Catálogo (Supabase) ============
export async function getCatalogo(tenant_id: string): Promise<CatalogoItem[]> {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const realId = resolveTenantId(tenant_id);
  const { prendas: excludedPrendas } = getTenantExclusions(realId);
  const isExcluded = (id: string, nombre: string) =>
    excludedPrendas.has(id.toLowerCase()) || excludedPrendas.has(normalize(nombre));

  // 1. Si estamos sin conexión, devolver inmediatamente del almacenamiento local
  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<CatalogoItem[]>(KEY.catalogo, []);
    const relevant = local.filter(
      (i) => (isSameTenant(i.tenant_id, tenant_id) || i.tenant_id === "admin") && !isExcluded(i.id, i.nombre),
    );
    if (relevant.length > 0) return relevant;
    return ((CATALOGO_PRENDAS_PREDEFINIDAS as any) || []).filter((i: any) => !isExcluded(i.id || "", i.nombre));
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
      const local = read<CatalogoItem[]>(KEY.catalogo, []);
      const localMap = new Map(local.map((x) => [x.id, x]));

      data
        .filter((i: any) => i.tenant_id !== "admin")
        .forEach((i: any) => {
          if (!isExcluded(i.id, i.nombre)) {
            const loc = localMap.get(i.id);
            const merged: CatalogoItem = {
              ...i,
              descripcion: i.descripcion || loc?.descripcion || undefined,
              precios_servicios:
                i.precios_servicios && Object.keys(i.precios_servicios).length > 0
                  ? i.precios_servicios
                  : (loc?.precios_servicios || {}),
            };
            finalItems.push(merged);
            namesSet.add(normalize(i.nombre));
          }
        });

      data
        .filter((i: any) => i.tenant_id === "admin")
        .forEach((i: any) => {
          if (!namesSet.has(normalize(i.nombre)) && !isExcluded(i.id, i.nombre)) {
            const loc = localMap.get(i.id);
            const merged: CatalogoItem = {
              ...i,
              descripcion: i.descripcion || loc?.descripcion || undefined,
              precios_servicios:
                i.precios_servicios && Object.keys(i.precios_servicios).length > 0
                  ? i.precios_servicios
                  : (loc?.precios_servicios || {}),
            };
            finalItems.push(merged);
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
    (i) => (isSameTenant(i.tenant_id, tenant_id) || i.tenant_id === "admin") && !isExcluded(i.id, i.nombre),
  );
  if (relevant.length > 0) return relevant;
  return ((CATALOGO_PRENDAS_PREDEFINIDAS as any) || []).filter((i: any) => !isExcluded(i.id || "", i.nombre));
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
    if (error) {
      console.warn("Error guardando catalogo_items en Supabase:", error);
      // Si la columna aún no está en Supabase, guardar versión básica para no bloquear
      const fallback = { ...itemToSave };
      delete (fallback as any).precios_servicios;
      delete (fallback as any).descripcion;
      const { error: fallbackError } = await supabase.from("catalogo_items").upsert(fallback);
      if (fallbackError) {
        throw fallbackError;
      }
    }
  } catch (err) {
    console.warn("Fallo de red o guardado remoto catalogo_items:", err);
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

export async function deleteCatalogoItem(id: string, tenantId?: string) {
  const local = read<CatalogoItem[]>(KEY.catalogo, []);
  const target = local.find((item) => item.id === id);
  const realTenantId = resolveTenantId(tenantId || target?.tenant_id || "");

  // Si el ítem es de muestra o pertenece a admin:
  if (target?.tenant_id === "admin" || target?.es_muestra || !target?.tenant_id) {
    if (realTenantId) {
      await eliminarPrendaMuestra(realTenantId, { id, nombre: target?.nombre || "" });
      return;
    }
  }

  // Si es un ítem creado por el tenant:
  if (typeof window !== "undefined")
    write(
      KEY.catalogo,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("catalogo_prendas", id);
  } catch {}

  // Zombie prevention: si existe un ítem admin homónimo, también agregarlo a exclusiones
  if (realTenantId && target?.nombre) {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const nameKey = normalize(target.nombre);
    const tenant = await getTenantById(realTenantId);
    const currentList = tenant?.config?.prendas_excluidas_muestra || [];
    if (!currentList.includes(nameKey)) {
      await saveTenantConfig(realTenantId, {
        prendas_excluidas_muestra: [...currentList, nameKey, id.toLowerCase()],
      });
    }
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id) return;
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
    if (error) {
      if (realTenantId && target?.nombre) {
        await eliminarPrendaMuestra(realTenantId, { id, nombre: target.nombre });
      }
    }
  } catch (error) {
    if (realTenantId && target?.nombre) {
      await eliminarPrendaMuestra(realTenantId, { id, nombre: target.nombre });
    }
  }
}

// ============ Servicios (Supabase) ============
export async function getServicios(tenant_id: string): Promise<Servicio[]> {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const realId = resolveTenantId(tenant_id);
  const { servicios: excludedServicios } = getTenantExclusions(realId);
  const isExcluded = (id: string, nombre: string) =>
    excludedServicios.has(id.toLowerCase()) || excludedServicios.has(normalize(nombre));

  const deduplicate = (services: Servicio[]): Servicio[] => {
    const byName = new Map<string, Servicio>();
    for (const service of services) {
      if (isExcluded(service.id, service.nombre)) continue;
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

  if (typeof window !== "undefined" && !navigator.onLine) {
    const local = read<Servicio[]>(KEY.servicios, []);
    const relevant = local.filter(
      (s) => (isSameTenant(s.tenant_id, tenant_id) || s.tenant_id === "admin") && !isExcluded(s.id, s.nombre),
    );
    if (relevant.length > 0) return deduplicate(relevant);
    return deduplicate(((SERVICIOS_PREDEFINIDOS as any) || []).filter((s: any) => !isExcluded(s.id || "", s.nombre)));
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
    (s) => (isSameTenant(s.tenant_id, tenant_id) || s.tenant_id === "admin") && !isExcluded(s.id, s.nombre),
  );
  if (relevant.length > 0) return deduplicate(relevant);
  return deduplicate(((SERVICIOS_PREDEFINIDOS as any) || []).filter((s: any) => !isExcluded(s.id || "", s.nombre)));
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

export async function deleteServicio(id: string, tenantId?: string) {
  const local = read<Servicio[]>(KEY.servicios, []);
  const target = local.find((item) => item.id === id);
  const realTenantId = resolveTenantId(tenantId || target?.tenant_id || "");

  // Si el servicio es de muestra o pertenece a admin:
  if (target?.tenant_id === "admin" || target?.es_muestra || !target?.tenant_id) {
    if (realTenantId) {
      await eliminarServicioMuestra(realTenantId, { id, nombre: target?.nombre || "" });
      return;
    }
  }

  if (isBrowser())
    write(
      KEY.servicios,
      local.filter((item) => item.id !== id),
    );
  try {
    await offlineDB.delete("catalogo_servicios", id);
  } catch {}

  // Zombie prevention:
  if (realTenantId && target?.nombre) {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const nameKey = normalize(target.nombre);
    const tenant = await getTenantById(realTenantId);
    const currentList = tenant?.config?.servicios_excluidos_muestra || [];
    if (!currentList.includes(nameKey)) {
      await saveTenantConfig(realTenantId, {
        servicios_excluidos_muestra: [...currentList, nameKey, id.toLowerCase()],
      });
    }
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    if (!target?.tenant_id) return;
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
    if (error) {
      if (realTenantId && target?.nombre) {
        await eliminarServicioMuestra(realTenantId, { id, nombre: target.nombre });
      }
    }
  } catch (error) {
    if (realTenantId && target?.nombre) {
      await eliminarServicioMuestra(realTenantId, { id, nombre: target.nombre });
    }
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
      promociones: !!p.modulos?.promociones,
      nomina: !!p.modulos?.nomina,
      cxp: !!p.modulos?.cxp,
      limite_whatsapp_mes:
        p.limite_whatsapp_mes !== undefined && p.limite_whatsapp_mes !== null
          ? Number(p.limite_whatsapp_mes)
          : 0,
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
  session_token?: string;
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
    if (isBrowser()) {
      sessionStorage.removeItem("klynn_screen_locked");
    }
  } else if (isBrowser()) {
    localStorage.removeItem(KEY.session);
    sessionStorage.removeItem("klynn_screen_locked");
  }
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

// ============ Control de Terminales y Seguridad ============

export function getTerminalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("klynn_terminal_token") || null;
}

export function setTerminalToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("klynn_terminal_token", token);
  }
}

export function removeTerminalToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("klynn_terminal_token");
  }
}

export function isCurrentTerminalAuthorized(tenant?: Tenant | null): boolean {
  if (!tenant) return true;
  if (!tenant.config?.control_terminales_activo) return true;
  const token = getTerminalToken();
  if (!token) return false;
  const termList = tenant.config?.terminales_autorizadas || [];
  return termList.some((t) => t.token === token);
}

export async function authorizeCurrentTerminal(
  tenantId: string,
  nombre: string
): Promise<{ ok: boolean; terminal?: TerminalAutorizada; error?: string }> {
  try {
    const realId = resolveTenantId(tenantId);
    const tenant = await getTenantById(realId);
    if (!tenant) return { ok: false, error: "Lavandería no encontrada" };
    const token = `term_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Navegador";
    const terminalName = nombre.trim() || "Terminal de Caja";
    const nowIso = new Date().toISOString();

    const newTerminal: TerminalAutorizada = {
      id: `term-${Date.now()}`,
      nombre: terminalName,
      token,
      creado_en: nowIso,
      ultimo_acceso: nowIso,
      user_agent: userAgent,
    };
    const currentList = tenant.config?.terminales_autorizadas || [];
    const updatedList = [...currentList, newTerminal];
    await saveTenantConfig(realId, {
      terminales_autorizadas: updatedList,
    });

    // Sincronizar en tabla dedicada public.terminales_autorizadas
    try {
      await supabase.from("terminales_autorizadas").insert({
        tenant_id: realId,
        nombre: terminalName,
        token,
        user_agent: userAgent,
        creado_en: nowIso,
        ultimo_acceso: nowIso,
      });
    } catch (dbErr) {
      console.warn("Aviso al registrar en terminales_autorizadas:", dbErr);
    }

    setTerminalToken(token);
    return { ok: true, terminal: newTerminal };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error al autorizar terminal" };
  }
}

export async function createTerminalPairingRequest(
  slug: string,
  nombreDispositivo?: string
): Promise<{ ok: boolean; codigo?: string; temporalToken?: string; error?: string }> {
  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { ok: false, error: "Lavandería no encontrada" };
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const temporalToken = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();
    const expiraEn = new Date(now + 15 * 60 * 1000).toISOString();
    const deviceName =
      nombreDispositivo ||
      (typeof navigator !== "undefined"
        ? navigator.userAgent.includes("Windows")
          ? "PC Windows"
          : navigator.userAgent.includes("Mac")
          ? "Mac"
          : "Terminal"
        : "Terminal");

    const newReq: SolicitudVinculacion = {
      codigo,
      temporal_token: temporalToken,
      nombre_dispositivo: deviceName,
      creado_en: new Date().toISOString(),
      expira_en: expiraEn,
      aprobada: false,
    };
    const validReqs = (tenant.config?.solicitudes_vinculacion || []).filter(
      (r) => Date.parse(r.expira_en) > now
    );
    await saveTenantConfig(tenant.id, {
      solicitudes_vinculacion: [...validReqs, newReq],
    });

    // Guardar también en tabla dedicada public.solicitudes_vinculacion_terminal
    try {
      await supabase.from("solicitudes_vinculacion_terminal").insert({
        tenant_id: tenant.id,
        codigo,
        temporal_token: temporalToken,
        nombre_dispositivo: deviceName,
        aprobada: false,
        expira_en: expiraEn,
      });
    } catch (dbErr) {
      console.warn("Aviso al registrar en solicitudes_vinculacion_terminal:", dbErr);
    }

    return { ok: true, codigo, temporalToken };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error al crear solicitud de enlace" };
  }
}

export async function approveTerminalPairingRequest(
  tenantId: string,
  codigo: string,
  nombre?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const realId = resolveTenantId(tenantId);
    const cleanCode = codigo.replace(/\D/g, "");
    const tenant = await getTenantById(realId);
    if (!tenant) return { ok: false, error: "Lavandería no encontrada" };

    let target = (tenant.config?.solicitudes_vinculacion || []).find(
      (r) => r.codigo === cleanCode && Date.parse(r.expira_en) > Date.now()
    );

    // Si no está en config local, buscar en la tabla de Supabase
    if (!target) {
      try {
        const { data: dbReq } = await supabase
          .from("solicitudes_vinculacion_terminal")
          .select("*")
          .eq("tenant_id", realId)
          .eq("codigo", cleanCode)
          .gt("expira_en", new Date().toISOString())
          .order("creado_en", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbReq) {
          target = {
            codigo: dbReq.codigo,
            temporal_token: dbReq.temporal_token,
            nombre_dispositivo: dbReq.nombre_dispositivo,
            creado_en: dbReq.creado_en,
            expira_en: dbReq.expira_en,
            aprobada: dbReq.aprobada,
          };
        }
      } catch {}
    }

    if (!target) {
      return { ok: false, error: "Código inválido o expirado. Genera uno nuevo en la pantalla de la terminal." };
    }

    const termName = (nombre && nombre.trim()) ? nombre.trim() : (target.nombre_dispositivo || "Terminal Vinculada");
    const nowIso = new Date().toISOString();

    const newTerminal: TerminalAutorizada = {
      id: `term-${Date.now()}`,
      nombre: termName,
      token: target.temporal_token,
      creado_en: nowIso,
      ultimo_acceso: nowIso,
    };
    const currentList = tenant.config?.terminales_autorizadas || [];
    const updatedList = [...currentList, newTerminal];
    const updatedReqs = (tenant.config?.solicitudes_vinculacion || []).map((r) =>
      r.codigo === cleanCode ? { ...r, aprobada: true } : r
    );
    await saveTenantConfig(realId, {
      terminales_autorizadas: updatedList,
      solicitudes_vinculacion: updatedReqs,
    });

    // Guardar en tabla terminales_autorizadas y actualizar solicitudes_vinculacion_terminal
    try {
      await supabase.from("terminales_autorizadas").insert({
        tenant_id: realId,
        nombre: termName,
        token: target.temporal_token,
        creado_en: nowIso,
        ultimo_acceso: nowIso,
      });

      await supabase
        .from("solicitudes_vinculacion_terminal")
        .update({ aprobada: true })
        .eq("tenant_id", realId)
        .eq("codigo", cleanCode);
    } catch (dbErr) {
      console.warn("Aviso al sincronizar tablas de vinculación:", dbErr);
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error al aprobar vinculación" };
  }
}

export async function checkTerminalPairingStatus(
  slug: string,
  codigo: string,
  temporalToken: string
): Promise<{ aprobada: boolean }> {
  try {
    const cleanCode = codigo.replace(/\D/g, "");

    // 1. Revisar si ya fue registrada en la tabla de Supabase
    try {
      const { data: dbTerm } = await supabase
        .from("terminales_autorizadas")
        .select("token")
        .eq("token", temporalToken)
        .maybeSingle();

      if (dbTerm) {
        setTerminalToken(temporalToken);
        return { aprobada: true };
      }

      const { data: dbReq } = await supabase
        .from("solicitudes_vinculacion_terminal")
        .select("aprobada")
        .eq("codigo", cleanCode)
        .eq("temporal_token", temporalToken)
        .maybeSingle();

      if (dbReq?.aprobada) {
        setTerminalToken(temporalToken);
        return { aprobada: true };
      }
    } catch {}

    // 2. Revisar configuración de tenant
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { aprobada: false };
    const isAuthorized = (tenant.config?.terminales_autorizadas || []).some(
      (t) => t.token === temporalToken
    );
    if (isAuthorized) {
      setTerminalToken(temporalToken);
      return { aprobada: true };
    }
    const req = (tenant.config?.solicitudes_vinculacion || []).find(
      (r) => r.codigo === cleanCode && r.temporal_token === temporalToken
    );
    if (req?.aprobada) {
      setTerminalToken(temporalToken);
      return { aprobada: true };
    }
    return { aprobada: false };
  } catch {
    return { aprobada: false };
  }
}

export async function revokeTerminal(
  tenantId: string,
  terminalId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const realId = resolveTenantId(tenantId);
    const tenant = await getTenantById(realId);
    if (!tenant) return { ok: false, error: "Lavandería no encontrada" };
    const currentList = tenant.config?.terminales_autorizadas || [];
    const targetTerm = currentList.find((t) => t.id === terminalId);
    const updatedList = currentList.filter((t) => t.id !== terminalId);
    await saveTenantConfig(realId, {
      terminales_autorizadas: updatedList,
    });

    if (targetTerm?.token) {
      try {
        await supabase
          .from("terminales_autorizadas")
          .delete()
          .eq("tenant_id", realId)
          .eq("token", targetTerm.token);
      } catch (dbErr) {
        console.warn("Aviso al eliminar de terminales_autorizadas:", dbErr);
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error al desvincular terminal" };
  }
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.slice(0, 2) : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const hFormatted = h < 10 ? `0${h}` : `${h}`;
  return `${hFormatted}:${m} ${ampm}`;
}

export function formatDaysList(days?: number[]): string {
  if (!days || days.length === 0) return "Ninguno";
  if (days.length === 7) return "Lunes a Domingo (Todos los días)";
  const map: Record<number, string> = {
    1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 0: "Domingo"
  };
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return sorted.map(d => map[d] || "").filter(Boolean).join(", ");
}

export function isWithinWorkingHours(config?: TenantConfig): { 
  permitida: boolean; 
  mensaje?: string; 
  apertura?: string; 
  cierre?: string; 
  dias?: number[]; 
} {
  if (!config || !config.control_horario_activo) return { permitida: true };
  const now = new Date();
  const currentDay = now.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const dias = config.dias_laborables || [1, 2, 3, 4, 5, 6];
  const apertura = config.horario_apertura || "08:00";
  const cierre = config.horario_cierre || "19:30";

  const diasNombre = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  if (!dias.includes(currentDay)) {
    return {
      permitida: false,
      apertura,
      cierre,
      dias,
      mensaje: `Hoy ${diasNombre[currentDay]} la lavandería permanece cerrada. El acceso a empleados está inhabilitado.`,
    };
  }

  const [hA, mA] = apertura.split(":").map(Number);
  const [hC, mC] = cierre.split(":").map(Number);

  const minutosActual = now.getHours() * 60 + now.getMinutes();
  const minutosApertura = hA * 60 + mA;
  const minutosCierre = hC * 60 + mC;

  if (minutosActual < minutosApertura || minutosActual > minutosCierre) {
    return {
      permitida: false,
      apertura,
      cierre,
      dias,
      mensaje: `Acceso restringido: Fuera del horario operativo de la lavandería (${formatTime12h(apertura)} a ${formatTime12h(cierre)}).`,
    };
  }

  return { permitida: true, apertura, cierre, dias };
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
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      // Si el error es por email no confirmado, intentar auto-confirmación y reintento
      if (authError.message?.toLowerCase().includes("confirm")) {
        try {
          const { data: empCheck } = await supabase
            .from("empleados")
            .select("id")
            .ilike("email", cleanEmail)
            .eq("tenant_id", tenant.id)
            .maybeSingle();

          if (empCheck?.id) {
            await supabase.rpc("admin_set_user_email", {
              target_user_id: empCheck.id,
              new_email: cleanEmail,
            });
            const retryRes = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (!retryRes.error && retryRes.data.user) {
              authData = retryRes.data;
              authError = null;
            }
          }
        } catch (e) {
          console.warn("Aviso en auto-confirmación durante login:", e);
        }
      }
    }

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

    // 5. Políticas de Seguridad (Solo aplican para empleados no administradores)
    // El rol ADMIN y SuperAdmin siempre tienen acceso 24/7 sin restricción de hardware u horario
    const isAdmin = emp.rol?.toUpperCase() === "ADMIN";
    if (!isAdmin) {
      // A. Control de Horario Operativo (Sincronizado con BD en caliente)
      let configHorario = tenant.config;
      try {
        const { data: dbHorario } = await supabase
          .from("horarios_laborales_sucursal")
          .select("*")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (dbHorario && dbHorario.activo) {
          configHorario = {
            ...(tenant.config || {}),
            control_horario_activo: true,
            horario_apertura: dbHorario.horario_apertura?.slice(0, 5) || tenant.config?.horario_apertura || "08:00",
            horario_cierre: dbHorario.horario_cierre?.slice(0, 5) || tenant.config?.horario_cierre || "19:30",
            dias_laborables: dbHorario.dias_laborables || tenant.config?.dias_laborables || [1, 2, 3, 4, 5, 6, 0],
          };
        }
      } catch (e) {}

      const checkHorario = isWithinWorkingHours(configHorario);
      if (!checkHorario.permitida) {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: checkHorario.mensaje || "Acceso fuera de horario laboral no permitido.",
          fueraDeHorario: true,
          horarioData: {
            apertura: checkHorario.apertura || configHorario?.horario_apertura || "08:00",
            cierre: checkHorario.cierre || configHorario?.horario_cierre || "19:30",
            dias: checkHorario.dias || configHorario?.dias_laborables || [1, 2, 3, 4, 5, 6, 0],
            mensaje: checkHorario.mensaje,
            tenant,
            empleado: emp,
          },
        } as any;
      }

      // B. Control de Terminal Autorizada (Hardware Pinning)
      if (tenant.config?.control_terminales_activo) {
        let isAuth = isCurrentTerminalAuthorized(tenant);
        if (!isAuth) {
          const token = getTerminalToken();
          if (token) {
            try {
              const { data: dbTerm } = await supabase
                .from("terminales_autorizadas")
                .select("id")
                .eq("tenant_id", tenant.id)
                .eq("token", token)
                .maybeSingle();
              if (dbTerm) isAuth = true;
            } catch {}
          }
        }
        if (!isAuth) {
          await supabase.auth.signOut();
          return {
            ok: false,
            error: "Dispositivo no autorizado. Solo puedes ingresar desde las terminales de caja vinculadas de la lavandería.",
          };
        }
      }
    }

    // Guardar en caché offline para permitir acceso futuro si se va la luz/red
    try {
      await cacheEmployeeForOffline(emp, password);
    } catch {}

    // C. Control de Sesión Única para Empleados
    let sessionToken: string | undefined;
    if (emp.rol !== "ADMIN" && tenant.config?.impedir_sesiones_simultaneas) {
      sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const activeSessions = {
        ...(tenant.config?.active_employee_sessions || {}),
        [emp.id]: sessionToken,
      };
      saveTenantConfig(tenant.id, { active_employee_sessions: activeSessions }).catch(() => {});
    }

    setSession({
      empleado_id: emp.id,
      tenant_id: tenant.id,
      iniciado_en: new Date().toISOString(),
      session_token: sessionToken,
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
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 600));
    await Promise.race([signOutPromise, timeoutPromise]).catch(() => {});
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
      sessionStorage.removeItem("klynn_screen_locked");
      // Limpiar cachés de sesión de empleados para evitar filtración de credenciales
      // (Se preserva klynn_tenant_cache_ y klynn_tenant_id_ para que la pantalla de login abra instantáneamente sin depender de red)
      Object.keys(localStorage).forEach((key) => {
        if (
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
        const safeEmployee = { ...empleado, password: "***", pin: empleado.pin || "" };
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
      if (session.empleado_id === "admin") {
        if (session.tenant_id === "admin") {
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
        } else {
          const ten = await getTenantById(session.tenant_id);
          if (ten) {
            const emp: Empleado = {
              id: "admin",
              tenant_id: ten.id,
              nombre: "Super Admin",
              email: "admin@klynn.com.do",
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
      }

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

  // 3. Si no hay usuario autenticado devuelto directamente por Supabase Auth (ej. token en renovación o modo impersonate)
  if (!user) {
    // Si tenemos una sesión local previa activa, recuperar el empleado y tenant sin cerrar la sesión
    if (session?.empleado_id && session?.tenant_id) {
      if (session.empleado_id === "admin") {
        if (session.tenant_id === "admin") {
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
        } else {
          // Super Admin impersonando una sucursal específica
          const ten = await getTenantById(session.tenant_id);
          if (ten) {
            const emp: Empleado = {
              id: "admin",
              tenant_id: ten.id,
              nombre: "Super Admin",
              email: "admin@klynn.com.do",
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

export function parseDateSafe(dateInput: string | Date | undefined | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getNextRenewalDate(
  startDateInput: string | Date | undefined | null,
  fromDate: Date = new Date(),
): Date {
  const parsed = parseDateSafe(startDateInput);
  if (!parsed) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + 30);
    return d;
  }

  const now = new Date(fromDate);
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const start = new Date(parsed);
  const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);

  const targetDay = start.getDate();

  const makeDate = (y: number, m: number, d: number) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const clampedDay = Math.min(d, daysInMonth);
    return new Date(y, m, clampedDay, 0, 0, 0, 0);
  };

  // Si la fecha de inicio es estrictamente en el futuro
  if (startZero.getTime() > nowZero.getTime()) {
    return makeDate(start.getFullYear(), start.getMonth() + 1, targetDay);
  }

  // Si la fecha de inicio es HOY (recién configurado o nuevo plan que arranca hoy)
  if (startZero.getTime() === nowZero.getTime()) {
    return makeDate(now.getFullYear(), now.getMonth() + 1, targetDay);
  }

  // Si la fecha de inicio fue en el pasado:
  let candidateYear = now.getFullYear();
  let candidateMonth = now.getMonth();
  let candidate = makeDate(candidateYear, candidateMonth, targetDay);

  // Si el día de corte de este mes ya llegó o ya pasó (<= hoy), la próxima renovación es el próximo mes
  if (candidate.getTime() <= nowZero.getTime()) {
    candidateMonth += 1;
    if (candidateMonth > 11) {
      candidateMonth = 0;
      candidateYear += 1;
    }
    candidate = makeDate(candidateYear, candidateMonth, targetDay);
  }

  return candidate;
}

export function getBillingCycleStart(
  planStartDateStr: string | Date | undefined | null,
  now: Date = new Date(),
): Date {
  const parsed = parseDateSafe(planStartDateStr);
  if (!parsed) return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const start = new Date(parsed);

  if (now.getTime() < start.getTime()) {
    return start;
  }

  const year = now.getFullYear();
  const month = now.getMonth();
  const targetDay = start.getDate();

  // Si el cliente inició o renovó en el mismo mes actual, el ciclo comienza en esa fecha/hora exacta
  if (start.getFullYear() === year && start.getMonth() === month) {
    return start;
  }

  const makeCycleStart = (y: number, m: number, d: number) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const clampedDay = Math.min(d, daysInMonth);
    return new Date(y, m, clampedDay, 0, 0, 0, 0);
  };

  let cycleStart = makeCycleStart(year, month, targetDay);

  // Si la fecha calculada está en el futuro, el ciclo actual comenzó en el mes anterior
  if (cycleStart.getTime() > now.getTime()) {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = year - 1;
    }
    cycleStart = makeCycleStart(prevYear, prevMonth, targetDay);
  }

  return cycleStart;
}

export async function getMonthlyOrderCount(
  tenantId: string,
  planFechaInicio?: string,
  tenantObj?: Tenant | null,
): Promise<number> {
  const all = (await getOrdenes(tenantId)).filter((o) => o.estado !== "ANULADA");

  const t = tenantObj || (await getTenantById(tenantId));
  const refDateStr = planFechaInicio || t?.plan_fecha_inicio || t?.config?.plan_fecha_inicio || t?.creado_en;
  const resetAtStr = t?.config?.ordenes_reset_at;

  const now = new Date();
  let cycleStart = getBillingCycleStart(refDateStr, now);

  if (resetAtStr) {
    const resetDate = new Date(resetAtStr);
    if (!isNaN(resetDate.getTime()) && resetDate.getTime() > cycleStart.getTime()) {
      cycleStart = resetDate;
    }
  }

  return all.filter((o) => {
    const d = new Date(o.creado_en);
    return d.getTime() >= cycleStart.getTime();
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

  const orderCount = await getMonthlyOrderCount(
    t.id,
    t.plan_fecha_inicio || t.config?.plan_fecha_inicio || t.creado_en,
    t,
  );
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
export interface ActiveLocalization {
  moneda_simbolo: string;
  moneda_codigo: string;
  impuesto_nombre: string;
  impuesto_porcentaje: number;
  pais_codigo: string;
  decimals: number;
}

export function getActiveTenantLocalization(): ActiveLocalization {
  let pais_codigo = "DO";
  let moneda_simbolo = "RD$";
  let moneda_codigo = "DOP";
  let impuesto_nombre = "ITBIS";
  let impuesto_porcentaje = 18;
  let decimals = 2;

  if (typeof window !== "undefined") {
    try {
      // 1. Prioridad: usuario autenticado actualmente en sesión
      const lastAuthStr = localStorage.getItem("klynn_last_auth_user");
      if (lastAuthStr) {
        const parsed = JSON.parse(lastAuthStr);
        const t = parsed?.tenant;
        if (t) {
          if (t.pais_codigo) pais_codigo = t.pais_codigo;
          else if (t.config?.pais_codigo) pais_codigo = t.config.pais_codigo;

          if (t.moneda_simbolo) moneda_simbolo = t.moneda_simbolo;
          else if (t.config?.moneda_simbolo) moneda_simbolo = t.config.moneda_simbolo;

          if (t.moneda_codigo) moneda_codigo = t.moneda_codigo;
          else if (t.config?.moneda_codigo) moneda_codigo = t.config.moneda_codigo;

          if (t.impuesto_nombre) impuesto_nombre = t.impuesto_nombre;
          else if (t.config?.impuesto_nombre) impuesto_nombre = t.config.impuesto_nombre;

          if (t.impuesto_porcentaje !== undefined && t.impuesto_porcentaje !== null) {
            impuesto_porcentaje = Number(t.impuesto_porcentaje);
          } else if (t.config?.impuesto_porcentaje !== undefined && t.config?.impuesto_porcentaje !== null) {
            impuesto_porcentaje = Number(t.config.impuesto_porcentaje);
          }
        }
      }

      // 2. Cache por slug del tenant en la URL actual (/t/:slug) o klynn_active_tenant
      const match = window.location.pathname.match(/\/t\/([^/]+)/);
      const currentSlug = match ? match[1] : localStorage.getItem("klynn_active_tenant");
      if (currentSlug && currentSlug !== "admin") {
        const cached = localStorage.getItem(`klynn_tenant_cache_${currentSlug}`);
        if (cached) {
          const t = JSON.parse(cached);
          if (t) {
            if (t.pais_codigo) pais_codigo = t.pais_codigo;
            else if (t.config?.pais_codigo) pais_codigo = t.config.pais_codigo;

            if (t.moneda_simbolo) moneda_simbolo = t.moneda_simbolo;
            else if (t.config?.moneda_simbolo) moneda_simbolo = t.config.moneda_simbolo;

            if (t.moneda_codigo) moneda_codigo = t.moneda_codigo;
            else if (t.config?.moneda_codigo) moneda_codigo = t.config.moneda_codigo;

            if (t.impuesto_nombre) impuesto_nombre = t.impuesto_nombre;
            else if (t.config?.impuesto_nombre) impuesto_nombre = t.config.impuesto_nombre;

            if (t.impuesto_porcentaje !== undefined && t.impuesto_porcentaje !== null) {
              impuesto_porcentaje = Number(t.impuesto_porcentaje);
            } else if (t.config?.impuesto_porcentaje !== undefined && t.config?.impuesto_porcentaje !== null) {
              impuesto_porcentaje = Number(t.config.impuesto_porcentaje);
            }
          }
        }
      }
    } catch {}
  }

  // Si el país no es República Dominicana pero por defecto quedó con valores de RD (RD$, ITBIS)
  // o si no tiene símbolo específico, auto-completar desde el catálogo oficial de países:
  if (pais_codigo && pais_codigo !== "DO") {
    const country = getCountry(pais_codigo);
    if (country) {
      if (moneda_simbolo === "RD$" || !moneda_simbolo) {
        moneda_simbolo = country.currency.symbol;
      }
      if (moneda_codigo === "DOP" || !moneda_codigo) {
        moneda_codigo = country.currency.code;
      }
      if (impuesto_nombre === "ITBIS" || !impuesto_nombre) {
        impuesto_nombre = country.tax.name;
      }
      decimals = country.currency.decimals;
    }
  } else if (pais_codigo === "COP" || pais_codigo === "CO" || pais_codigo === "CLP" || pais_codigo === "CL") {
    decimals = 0;
  }

  return {
    moneda_simbolo,
    moneda_codigo,
    impuesto_nombre,
    impuesto_porcentaje,
    pais_codigo,
    decimals,
  };
}

export function getTenantCurrencySymbol(tenant?: Partial<Tenant> | Partial<TenantConfig> | null): string {
  if (tenant) {
    const sym = tenant.moneda_simbolo || ("config" in tenant && tenant.config?.moneda_simbolo);
    const country = tenant.pais_codigo || ("config" in tenant && tenant.config?.pais_codigo);
    if (sym && (sym !== "RD$" || country === "DO")) return sym;
    if (country && country !== "DO") {
      return getCountry(country).currency.symbol;
    }
  }
  return getActiveTenantLocalization().moneda_simbolo;
}

export function getTenantTaxName(tenant?: Partial<Tenant> | Partial<TenantConfig> | null): string {
  if (tenant) {
    const tax = tenant.impuesto_nombre || ("config" in tenant && tenant.config?.impuesto_nombre);
    const country = tenant.pais_codigo || ("config" in tenant && tenant.config?.pais_codigo);
    if (tax && (tax !== "ITBIS" || country === "DO")) return tax;
    if (country && country !== "DO") {
      return getCountry(country).tax.name;
    }
  }
  return getActiveTenantLocalization().impuesto_nombre;
}

export function formatMoney(
  n: number,
  tenantOrSymbol?: Partial<Tenant> | Partial<TenantConfig> | string | null,
  options?: { decimals?: number }
): string {
  const activeLoc = getActiveTenantLocalization();

  let symbol = activeLoc.moneda_simbolo;
  let decimals = options?.decimals ?? activeLoc.decimals;
  let countryCode = activeLoc.pais_codigo;

  if (typeof tenantOrSymbol === "string" && tenantOrSymbol) {
    if (tenantOrSymbol !== "RD$" || activeLoc.pais_codigo === "DO") {
      symbol = tenantOrSymbol;
    }
  } else if (tenantOrSymbol && typeof tenantOrSymbol === "object") {
    const rawCountry =
      tenantOrSymbol.pais_codigo ||
      ("config" in tenantOrSymbol && tenantOrSymbol.config?.pais_codigo);

    if (rawCountry) {
      countryCode = rawCountry;
    }

    const rawSymbol =
      tenantOrSymbol.moneda_simbolo ||
      ("config" in tenantOrSymbol && tenantOrSymbol.config?.moneda_simbolo);

    if (rawSymbol && (rawSymbol !== "RD$" || countryCode === "DO")) {
      symbol = rawSymbol;
    } else if (countryCode && countryCode !== "DO") {
      const c = getCountry(countryCode);
      if (c) symbol = c.currency.symbol;
    }

    if (options?.decimals === undefined) {
      if (countryCode === "COP" || countryCode === "CO" || countryCode === "CLP" || countryCode === "CL") {
        decimals = 0;
      } else {
        const c = getCountry(countryCode);
        if (c) decimals = c.currency.decimals;
      }
    }
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);

  const spacing = symbol.length > 2 && !symbol.includes("$") ? " " : "";
  return `${symbol}${spacing}${formatted}`;
}

export function formatRD(
  n: number,
  tenantOrSymbol?: Partial<Tenant> | Partial<TenantConfig> | string | null,
  options?: { decimals?: number }
): string {
  return formatMoney(n, tenantOrSymbol, options);
}
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}
/** Parse "1,234.56", "1234.56", "20,5" or "30,79" into number. */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  let str = String(raw).trim();
  if (!str.includes(".") && (/,\d{1,2}$/.test(str) || str.endsWith(","))) {
    str = str.replace(/,(\d{1,2})?$/, (m, dec) => (dec !== undefined ? `.${dec}` : "."));
  }
  const cleaned = str.replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
/** Format while typing: keeps decimals user is typing (supports '.' and ','). */
export function formatAmountInput(raw: string): string {
  if (!raw) return "";
  let str = String(raw);
  if (!str.includes(".") && (/,\d{1,2}$/.test(str) || str.endsWith(","))) {
    str = str.replace(/,(\d{1,2})?$/, (m, dec) => (dec !== undefined ? `.${dec}` : "."));
  }
  const cleaned = str.replace(/[^\d.]/g, "");
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
  if (!iso || iso === "null") return "";
  // Si viene en formato solo fecha YYYY-MM-DD, parsear en fecha local para evitar desfase de zona horaria UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
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

    // Mantener el contrato histórico completo de ecf_config. Los campos legacy
    // de Pronesoft siguen disponibles para respaldos/otras versiones; el token
    // EF2 nuevo nunca se persiste aquí (vive en ecf_provider_credentials).
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
  // Los tokens EF2 se guardan exclusivamente mediante ef2-proxy en
  // ecf_provider_credentials; jamás deben quedar en caché/localStorage.
  const { ef2_token: _ef2Token, ...safeConfig } = config;
  const configToSave = { ...safeConfig, tenant_id: realId } as ECFConfig;
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

  // Helper de reconciliación: alinea secuencias con el máximo NCF ya emitido en órdenes
  const reconcileWithOrders = (sequences: ECFSequence[]): ECFSequence[] => {
    let localOrders: Orden[] = [];
    try {
      localOrders = read<Orden[]>(KEY.ordenes, []);
    } catch {}

    let hasChanges = false;
    const reconciled = sequences.map((s) => {
      let maxOrderNum = 0;
      for (const o of localOrders) {
        // SEGURIDAD MULTI-TENANT: Solo considerar órdenes de este tenant específico
        if (o.tenant_id && o.tenant_id !== realId && o.tenant_id !== tenantId) continue;
        if (o.ncf && o.ncf.startsWith(s.tipo_ecf)) {
          const numPart = parseInt(o.ncf.slice(s.tipo_ecf.length), 10);
          // SEGURIDAD RANGO: Solo considerar números dentro del rango válido de la secuencia
          if (!isNaN(numPart) && numPart >= s.valor_inicial && numPart <= s.valor_final && numPart > maxOrderNum) {
            maxOrderNum = numPart;
          }
        }
      }
      const currentVal = Number(s.valor_actual || 0);
      const isCorrupted = currentVal > s.valor_final;
      const effectiveVal = isCorrupted ? 0 : currentVal;

      if (maxOrderNum > effectiveVal || isCorrupted) {
        const nextVal = Math.max(maxOrderNum, isCorrupted ? maxOrderNum : effectiveVal);
        hasChanges = true;
        if (typeof window === "undefined" || navigator.onLine) {
          void supabase
            .from("ecf_sequences")
            .update({ valor_actual: nextVal })
            .eq("id", String(s.id))
            .then();
        }
        return { ...s, valor_actual: nextVal };
      }
      return s;
    });

    if (hasChanges && typeof window !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify(reconciled));
      localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(reconciled));
    }
    return reconciled;
  };

  if (typeof window !== "undefined" && !navigator.onLine) {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${tenantId}`);
    if (cached) {
      try {
        return reconcileWithOrders(JSON.parse(cached));
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
    if (!error && data && Array.isArray(data)) {
      const reconciled = reconcileWithOrders(data);
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(reconciled));
        localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(reconciled));
      }
      return reconciled;
    }
  } catch (e) {
    console.warn("Aviso al obtener secuencias:", e);
  }

  if (typeof window !== "undefined") {
    const cached =
      localStorage.getItem(cacheKey) || localStorage.getItem(`klynn_ecf_seqs_${tenantId}`);
    if (cached) {
      try {
        return reconcileWithOrders(JSON.parse(cached));
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
    rnc_receptor_nombre: doc.rnc_receptor_nombre || (doc as any).cliente_nombre || null,
    track_id: doc.track_id || null,
    status: doc.status || "pending",
    // EF2 se identifica explícitamente para que el conciliador de servidor
    // procese únicamente sus documentos, sin tocar los registros legacy.
    provider: (doc as any).provider || null,
    provider_document_id: (doc as any).provider_document_id || null,
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

/**
 * Generador y gestor de secuencias exclusivo para FACTURACIÓN TRADICIONAL (NCF de la DGII).
 * Aislado completamente del flujo electrónico (e-CF / EF2).
 * Incluye soporte completo OFFLINE (IndexedDB / Outbox) y ONLINE (Supabase).
 */
export async function nextNCFTradicional(
  tenantId: string,
  tipoNCF: string,
): Promise<{ ncf: string; expiration_date?: string }> {
  const realId = resolveTenantId(tenantId);
  const normalizedTipo = tipoNCF.startsWith("B")
    ? tipoNCF
    : tipoNCF === "E31"
      ? "B01"
      : tipoNCF === "E34"
        ? "B04"
        : tipoNCF.startsWith("E")
          ? `B${tipoNCF.slice(1)}`
          : `B${tipoNCF}`;

  const padLen = 8; // Formato tradicional DGII: Tipo (Bxx) + 8 dígitos
  const cacheKey = `klynn_ecf_seqs_${realId}`;

  // 1. Número máximo YA utilizado en órdenes locales existentes
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

  // Buscar secuencia tradicional para este tipo
  let seqIndex = localSeqs.findIndex(
    (s) =>
      (s.tipo_ecf === normalizedTipo || s.tipo === normalizedTipo) &&
      s.is_active !== false &&
      s.activa !== false,
  );
  let seq = seqIndex >= 0 ? localSeqs[seqIndex] : null;

  // Si estamos online y no encontramos la secuencia en caché local, intentar obtener de Supabase
  if (!seq && (typeof window === "undefined" || navigator.onLine)) {
    try {
      const { data } = await supabase
        .from("ecf_sequences")
        .select("*")
        .eq("tenant_id", realId)
        .eq("tipo_ecf", normalizedTipo)
        .maybeSingle();
      if (data) {
        seq = data;
        localSeqs.push(data);
        seqIndex = localSeqs.length - 1;
      }
    } catch {}
  }

  const currentSeqVal = seq ? Number(seq.valor_actual ?? 0) : 0;
  const initialSeqVal = seq ? Number(seq.valor_inicial ?? 1) : 1;
  const localCounter = read<number>(`klynn_ncf_sec_${realId}_${normalizedTipo}`, 0);

  // El siguiente número DEBE ser estrictamente mayor a todas las fuentes conocidas
  const baseNum = Math.max(currentSeqVal, maxOrderNum, localCounter, initialSeqVal - 1);
  const proximo = baseNum + 1;

  // 3. Actualizar inmediatamente todas las fuentes locales (0ms latencia para POS)
  if (seqIndex >= 0) {
    localSeqs[seqIndex].valor_actual = proximo;
  } else {
    localSeqs.push({
      id: seq?.id || uid("seq_trad"),
      tenant_id: realId,
      tipo_ecf: normalizedTipo,
      prefijo: "B",
      valor_inicial: initialSeqVal,
      valor_final: 99999999,
      valor_actual: proximo,
      is_active: true,
      activa: true,
    });
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(cacheKey, JSON.stringify(localSeqs));
    localStorage.setItem(`klynn_ecf_seqs_${tenantId}`, JSON.stringify(localSeqs));
  }
  write(`klynn_ncf_sec_${realId}_${normalizedTipo}`, proximo);
  write(`klynn_ncf_sec_${tenantId}_${normalizedTipo}`, proximo);

  const encf = `${normalizedTipo}${String(proximo).padStart(padLen, "0")}`;

  // 3.1 Verificar alerta automática de secuencia baja por WhatsApp
  const targetSeq = seqIndex >= 0 ? localSeqs[seqIndex] : seq;
  if (targetSeq && targetSeq.recibir_alertas && targetSeq.alerta_limite) {
    const restantes = Math.max(0, (targetSeq.valor_final || 0) - proximo);
    if (restantes <= targetSeq.alerta_limite) {
      import("./whatsapp").then(({ checkAndTriggerSequenceWhatsAppAlert }) => {
        checkAndTriggerSequenceWhatsAppAlert({
          tenantId: realId,
          seq: targetSeq,
          restantes,
          ultimoEmitido: encf,
        }).catch((err) => console.warn("Aviso alerta WhatsApp NCF:", err));
      }).catch(() => {});
    }
  }

  // 4. Sincronización en Base de Datos / Outbox (Soporte Online + Offline)
  const isOnline = typeof window !== "undefined" ? navigator.onLine : true;

  if (isOnline) {
    try {
      if (seq?.id) {
        const { data: updated } = await supabase
          .from("ecf_sequences")
          .update({ valor_actual: proximo })
          .eq("id", String(seq.id))
          .select("id");
        if (!updated || updated.length === 0) {
          await supabase
            .from("ecf_sequences")
            .update({ valor_actual: proximo })
            .eq("tenant_id", realId)
            .eq("tipo_ecf", normalizedTipo);
        }
      } else {
        await supabase
          .from("ecf_sequences")
          .update({ valor_actual: proximo })
          .eq("tenant_id", realId)
          .eq("tipo_ecf", normalizedTipo);
      }
    } catch (err) {
      console.warn("Aviso actualizando secuencia NCF tradicional en Supabase:", err);
    }
  } else {
    // 🌐 MODO OFFLINE: Encolar en IndexedDB Outbox para sincronización automática
    try {
      await offlineDB.addToOutbox({
        id: `seq_${seq?.id || normalizedTipo}_${Date.now()}`,
        tenant_id: realId,
        table_name: "ecf_sequences",
        action: "UPDATE",
        payload: {
          id: seq?.id,
          tenant_id: realId,
          tipo_ecf: normalizedTipo,
          valor_actual: proximo,
        },
      });
      window.dispatchEvent(new CustomEvent("klynn-offline-save"));
    } catch (offlineErr) {
      console.warn("Aviso encolando secuencia NCF tradicional en Outbox:", offlineErr);
    }
  }

  return {
    ncf: encf,
    expiration_date: seq?.expiration_date || seq?.fecha_vencimiento,
  };
}

/**
 * Generador exclusivo para FACTURACIÓN ELECTRÓNICA (e-CF de la DGII vía EF2).
 * Formato oficial e-CF de 10 dígitos (E31..., E32..., etc.)
 */
export async function nextECFNumero(
  tenantId: string,
  tipo: string,
): Promise<{ ncf: string; expiration_date?: string }> {
  const realId = resolveTenantId(tenantId);
  const normalizedTipo = tipo.startsWith("E") ? tipo : `E${tipo}`;

  const padLen = 10;
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
  } else {
    localSeqs.push({
      id: uid("seq"),
      tenant_id: realId,
      tipo_ecf: normalizedTipo,
      prefijo: "E",
      valor_inicial: 1,
      valor_final: 9999999999,
      valor_actual: proximo,
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

  // Verificar alerta automática de secuencia baja por WhatsApp
  const targetSeq = seqIndex >= 0 ? localSeqs[seqIndex] : seq;
  if (targetSeq && targetSeq.recibir_alertas && targetSeq.alerta_limite) {
    const restantes = Math.max(0, (targetSeq.valor_final || 0) - proximo);
    if (restantes <= targetSeq.alerta_limite) {
      import("./whatsapp").then(({ checkAndTriggerSequenceWhatsAppAlert }) => {
        checkAndTriggerSequenceWhatsAppAlert({
          tenantId: realId,
          seq: targetSeq,
          restantes,
          ultimoEmitido: encf,
        }).catch((err) => console.warn("Aviso alerta WhatsApp e-CF:", err));
      }).catch(() => {});
    }
  }

  // Si estamos online, actualizar Supabase
  if (typeof window === "undefined" || navigator.onLine) {
    if (seq?.id) {
      supabase
        .from("ecf_sequences")
        .update({ valor_actual: proximo })
        .eq("id", String(seq.id))
        .then();
    }
  }

  return { ncf: encf, expiration_date: seq?.expiration_date || seq?.fecha_vencimiento };
}

export async function getECFDocumentosRecibidos(tenantId: string): Promise<ECFDocumentRecibido[]> {
  // EF2 no documenta un endpoint de comprobantes recibidos ni de aprobación
  // comercial. Conservamos y mostramos los registros ya ingeridos en Supabase,
  // pero no consultamos al proveedor legado.
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
  void tenantId;
  const { error } = await supabase
    .from("ecf_documentos_recibidos")
    .update({ estado_comercial: estado })
    .eq("id", id);

  if (error) throw error;
}

export async function updateECFConfig(tenantId: string, updates: Partial<ECFConfig>) {
  const { ef2_token: _ef2Token, ...safeUpdates } = updates;
  updates = safeUpdates;
  const targetEnv = updates.ef2_environment || updates.pronesoft_environment;
  if (targetEnv || updates.ambiente) {
    try {
      const { error: rpcError } = await supabase.rpc("admin_update_ecf_environment", {
        p_tenant_id: tenantId,
        p_environment: targetEnv || "TesteCF",
        p_ambiente: updates.ambiente || (targetEnv === "eCF" ? "produccion" : "pruebas"),
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
      .eq("leida", false)
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

// ============ Centro de Comunicados Administrativos (Super Admin) ============

export async function enviarComunicadoAdmin(options: {
  tenantId?: string; // "all" o UUID específico
  titulo: string;
  mensaje: string;
  tipo?: string;
  link?: string | null;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const isGlobal = !options.tenantId || options.tenantId === "all";
    let targetTenants: { id: string; nombre?: string }[] = [];

    if (isGlobal) {
      const { data: allTenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, nombre")
        .neq("estado", "ELIMINADO");
      if (tErr || !allTenants || allTenants.length === 0) {
        return { ok: false, count: 0, error: "No se encontraron lavanderías activas" };
      }
      targetTenants = allTenants;
    } else {
      targetTenants = [{ id: options.tenantId! }];
    }

    const tipoNotif = options.tipo || "ADMIN_ANUNCIO";
    const nowIso = new Date().toISOString();

    const notifsToInsert = targetTenants.map((t) => ({
      id: uid("notif"),
      tenant_id: t.id,
      titulo: options.titulo,
      mensaje: options.mensaje,
      tipo: tipoNotif,
      leida: false,
      link: options.link || null,
      created_at: nowIso,
    }));

    // 1. Inserción en lotes en Base de Datos Supabase
    const { error: insertErr } = await supabase.from("notificaciones").insert(notifsToInsert);
    if (insertErr) {
      console.warn("Aviso al insertar notificaciones en DB:", insertErr);
    }

    // 2. Transmisión Realtime por cada lavandería
    for (const notif of notifsToInsert) {
      try {
        // BroadcastChannel local entre pestañas
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel(`klynn_tenant_${notif.tenant_id}`);
          bc.postMessage({ type: "NUEVA_NOTIFICACION", notificacion: notif });
          bc.close();
        }

        // Supabase Realtime channel
        const channel = supabase.channel(`tenant_events_${notif.tenant_id}`);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel
              .send({
                type: "broadcast",
                event: "nueva_notificacion",
                payload: notif,
              })
              .then(() => {
                setTimeout(() => supabase.removeChannel(channel), 1200);
              });
          }
        });
      } catch (bcErr) {
        console.warn("Aviso en broadcast de comunicado:", bcErr);
      }
    }

    return { ok: true, count: targetTenants.length };
  } catch (err: any) {
    return { ok: false, count: 0, error: err.message || "Error al enviar comunicado" };
  }
}

export async function getHistorialComunicadosAdmin(): Promise<Notificacion[]> {
  try {
    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .or("tipo.ilike.ADMIN_%,tipo.eq.BROADCAST")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) return [];
    return data as Notificacion[];
  } catch {
    return [];
  }
}

export async function eliminarComunicadoAdmin(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("notificaciones").delete().eq("id", id);
    return !error;
  } catch {
    return false;
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

// ============ PROMOCIONES ============

export async function getPromociones(tenantId: string): Promise<Promocion[]> {
  if (!tenantId || tenantId === "__loading__") return [];

  const localKey = `klynn_promociones_${tenantId}`;
  try {
    const { data, error } = await supabase
      .from("promociones")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("creado_en", { ascending: false });

    if (error) {
      // Si la tabla aún no se ha creado o da error, usar fallback de localStorage
      console.warn("getPromociones fallback:", error.message);
      const cached = localStorage.getItem(localKey);
      return cached ? JSON.parse(cached) : [];
    }

    if (data) {
      localStorage.setItem(localKey, JSON.stringify(data));
      return data as Promocion[];
    }
  } catch (e) {
    console.warn("getPromociones exception, using local cache:", e);
    const cached = localStorage.getItem(localKey);
    return cached ? JSON.parse(cached) : [];
  }
  return [];
}

export async function savePromocion(p: Partial<Promocion> & { tenant_id: string; nombre: string }): Promise<Promocion> {
  const isNew = !p.id;
  const promo: Promocion = {
    id: p.id || uid(),
    tenant_id: p.tenant_id,
    nombre: p.nombre,
    descripcion: p.descripcion || "",
    tipo_descuento: p.tipo_descuento || "PORCENTAJE",
    valor_descuento: Number(p.valor_descuento || 0),
    nxm_compra: p.nxm_compra !== undefined && p.nxm_compra !== null ? Number(p.nxm_compra) : null,
    nxm_gratis: p.nxm_gratis !== undefined && p.nxm_gratis !== null ? Number(p.nxm_gratis) : null,
    nxm_porcentaje: p.nxm_porcentaje !== undefined && p.nxm_porcentaje !== null ? Number(p.nxm_porcentaje) : null,
    tipo_aplicacion: p.tipo_aplicacion || "TODA_LA_ORDEN",
    categorias: p.categorias || [],
    servicios: p.servicios || [],
    prendas: p.prendas || [],
    dias_semana: p.dias_semana && p.dias_semana.length > 0 ? p.dias_semana : [0, 1, 2, 3, 4, 5, 6],
    fecha_inicio: p.fecha_inicio || undefined,
    fecha_fin: p.fecha_fin || undefined,
    min_piezas: Number(p.min_piezas || 0),
    min_subtotal: Number(p.min_subtotal || 0),
    min_libras: Number(p.min_libras || 0),
    codigo_cupon: p.codigo_cupon ? p.codigo_cupon.trim().toUpperCase() : undefined,
    es_automatica: p.es_automatica ?? true,
    activo: p.activo ?? true,
    veces_usada: p.veces_usada || 0,
    total_descontado: p.total_descontado || 0,
    creado_en: p.creado_en || new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };

  const localKey = `klynn_promociones_${promo.tenant_id}`;

  try {
    const { data, error } = await supabase
      .from("promociones")
      .upsert(promo)
      .select()
      .single();

    if (!error && data) {
      return data as Promocion;
    }
    if (error) {
      console.warn("savePromocion supabase error, fallback to local:", error.message);
    }
  } catch (e) {
    console.warn("savePromocion exception, saving locally:", e);
  }

  // Fallback local
  const current = await getPromociones(promo.tenant_id);
  const updated = isNew
    ? [promo, ...current.filter((x) => x.id !== promo.id)]
    : current.map((x) => (x.id === promo.id ? promo : x));
  localStorage.setItem(localKey, JSON.stringify(updated));
  return promo;
}

export async function togglePromocionActiva(id: string, tenantId: string, activo: boolean): Promise<void> {
  const localKey = `klynn_promociones_${tenantId}`;
  try {
    await supabase.from("promociones").update({ activo, actualizado_en: new Date().toISOString() }).eq("id", id);
  } catch (e) {
    console.warn("togglePromocionActiva error:", e);
  }

  const current = await getPromociones(tenantId);
  const updated = current.map((p) => (p.id === id ? { ...p, activo } : p));
  localStorage.setItem(localKey, JSON.stringify(updated));
}

export async function deletePromocion(id: string, tenantId: string): Promise<void> {
  const localKey = `klynn_promociones_${tenantId}`;
  try {
    await supabase.from("promociones").delete().eq("id", id);
  } catch (e) {
    console.warn("deletePromocion error:", e);
  }

  const current = await getPromociones(tenantId);
  const updated = current.filter((p) => p.id !== id);
  localStorage.setItem(localKey, JSON.stringify(updated));
}

export async function registrarUsoPromocion(id: string, tenantId: string, montoDescontado: number): Promise<void> {
  if (!id || !tenantId) return;
  try {
    const current = await getPromociones(tenantId);
    const promo = current.find((p) => p.id === id);
    if (!promo) return;

    const nuevasVeces = (promo.veces_usada || 0) + 1;
    const nuevoTotal = +(Number(promo.total_descontado || 0) + Number(montoDescontado || 0)).toFixed(2);

    await supabase
      .from("promociones")
      .update({ veces_usada: nuevasVeces, total_descontado: nuevoTotal })
      .eq("id", id);

    const localKey = `klynn_promociones_${tenantId}`;
    const updated = current.map((p) =>
      p.id === id ? { ...p, veces_usada: nuevasVeces, total_descontado: nuevoTotal } : p
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch (e) {
    console.warn("registrarUsoPromocion error:", e);
  }
}

// ============================================================
// CUENTAS POR PAGAR (CXP) — Operaciones de Almacenamiento
// ============================================================

export function calcularDiasVencimientoCXP(fechaVencimiento: string): number {
  if (!fechaVencimiento) return 0;
  const target = new Date(fechaVencimiento);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getEstadoMoraCXP(fechaVencimiento: string, saldo: number): EstadoMoraCXP {
  if (saldo <= 0) return "PAGADA";
  const diasParaVencer = calcularDiasVencimientoCXP(fechaVencimiento);
  if (diasParaVencer < -30) return "CRITICA"; // Vencida hace más de 30 días
  if (diasParaVencer < 0) return "VENCIDA";    // Vencida
  if (diasParaVencer <= 7) return "POR_VENCER"; // Vence en los próximos 7 días
  return "AL_DIA";
}

export async function getSuplidores(tenantId: string): Promise<Suplidor[]> {
  const realId = resolveTenantId(tenantId);
  const local = read<Suplidor[]>(KEY.suplidores, []).filter(
    (s) => s.tenant_id === realId || s.tenant_id === tenantId,
  );

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    const fetchPromise = supabase
      .from("suplidores")
      .select("*")
      .eq("tenant_id", realId)
      .order("nombre_comercial", { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const mapped: Suplidor[] = data.map((item: any) => ({
        ...item,
        email: item.correo || item.email || "",
      }));
      const allLocal = read<Suplidor[]>(KEY.suplidores, []);
      const others = allLocal.filter((s) => s.tenant_id !== realId && s.tenant_id !== tenantId);
      write(KEY.suplidores, [...mapped, ...others]);
      return mapped;
    }
  } catch (e) {
    console.warn("getSuplidores error, using local:", e);
  }

  return local;
}

export async function saveSuplidor(suplidor: Suplidor): Promise<void> {
  const realId = resolveTenantId(suplidor.tenant_id);
  const toSave = { ...suplidor, tenant_id: realId, actualizado_en: new Date().toISOString() };

  const allLocal = read<Suplidor[]>(KEY.suplidores, []);
  const idx = allLocal.findIndex((s) => s.id === toSave.id);
  if (idx >= 0) {
    allLocal[idx] = toSave;
  } else {
    allLocal.push(toSave);
  }
  write(KEY.suplidores, allLocal);

  try {
    const { email, limite_credito, ...rest } = toSave as any;
    const payload = {
      ...rest,
      correo: suplidor.email || (suplidor as any).correo || null,
    };
    const { error } = await supabase.from("suplidores").upsert(payload);
    if (error) {
      console.error("saveSuplidor supabase error:", error);
    }
  } catch (e) {
    console.warn("saveSuplidor supabase error:", e);
  }
}

export async function deleteSuplidor(id: string, tenantId: string): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<Suplidor[]>(KEY.suplidores, []);
  write(
    KEY.suplidores,
    allLocal.filter((s) => !(s.id === id && (s.tenant_id === realId || s.tenant_id === tenantId))),
  );

  try {
    const { error } = await supabase.from("suplidores").delete().eq("id", id).eq("tenant_id", realId);
    if (error) {
      console.error("deleteSuplidor supabase error:", error);
    }
  } catch (e) {
    console.warn("deleteSuplidor supabase error:", e);
  }
}

export async function getFacturasCXP(tenantId: string): Promise<FacturaCXP[]> {
  const realId = resolveTenantId(tenantId);
  const local = read<FacturaCXP[]>(KEY.facturas_cxp, []).filter(
    (f) => f.tenant_id === realId || f.tenant_id === tenantId,
  );

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local.map((f) => ({
      ...f,
      estado_mora: getEstadoMoraCXP(f.fecha_vencimiento, f.saldo_pendiente),
      dias_vencida: -calcularDiasVencimientoCXP(f.fecha_vencimiento),
    }));
  }

  try {
    const fetchPromise = supabase
      .from("facturas_cxp")
      .select("*, suplidores(*)")
      .eq("tenant_id", realId)
      .order("fecha_vencimiento", { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const mapped: FacturaCXP[] = data.map((item: any) => ({
        id: item.id,
        tenant_id: item.tenant_id,
        suplidor_id: item.suplidor_id,
        numero_factura: item.numero_factura,
        ncf: item.ncf,
        tipo_ncf: item.tipo_ncf || (item.ncf ? item.ncf.substring(0, 3) : "B01"),
        fecha_emision: item.fecha_emision,
        plazo_dias: item.dias_credito ?? item.plazo_dias ?? 30,
        fecha_vencimiento: item.fecha_vencimiento,
        subtotal: Number(item.subtotal || 0),
        itbis: Number(item.itbis || 0),
        total: Number(item.total || 0),
        monto_pagado: Number(item.monto_pagado || 0),
        saldo_pendiente: Number(item.saldo_pendiente ?? item.total ?? 0),
        estado: (item.estado_pago as EstadoFacturaCXP) || item.estado || "PENDIENTE",
        categoria_gasto: item.categoria_gasto || "INSUMOS",
        descripcion: item.notas || item.descripcion || "",
        comprobante_url: item.comprobante_url,
        creado_por: item.creado_por,
        creado_en: item.creado_en,
        actualizado_en: item.actualizado_en,
        suplidor: item.suplidores
          ? {
              ...item.suplidores,
              email: item.suplidores.correo || item.suplidores.email || "",
            }
          : undefined,
        estado_mora: item.estado_mora || getEstadoMoraCXP(item.fecha_vencimiento, item.saldo_pendiente),
        dias_vencida: -calcularDiasVencimientoCXP(item.fecha_vencimiento),
      }));

      const allLocal = read<FacturaCXP[]>(KEY.facturas_cxp, []);
      const others = allLocal.filter((f) => f.tenant_id !== realId && f.tenant_id !== tenantId);
      write(KEY.facturas_cxp, [...mapped, ...others]);
      return mapped;
    }
  } catch (e) {
    console.warn("getFacturasCXP error, using local:", e);
  }

  return local.map((f) => ({
    ...f,
    estado_mora: getEstadoMoraCXP(f.fecha_vencimiento, f.saldo_pendiente),
    dias_vencida: -calcularDiasVencimientoCXP(f.fecha_vencimiento),
  }));
}

export async function saveFacturaCXP(factura: FacturaCXP): Promise<void> {
  const realId = resolveTenantId(factura.tenant_id);
  const toSave = { ...factura, tenant_id: realId, actualizado_en: new Date().toISOString() };

  const allLocal = read<FacturaCXP[]>(KEY.facturas_cxp, []);
  const idx = allLocal.findIndex((f) => f.id === toSave.id);
  if (idx >= 0) {
    allLocal[idx] = toSave;
  } else {
    allLocal.push(toSave);
  }
  write(KEY.facturas_cxp, allLocal);

  try {
    const payload = {
      id: toSave.id,
      tenant_id: realId,
      suplidor_id: toSave.suplidor_id,
      numero_factura: toSave.numero_factura,
      ncf: toSave.ncf || null,
      fecha_emision: toSave.fecha_emision,
      fecha_vencimiento: toSave.fecha_vencimiento,
      subtotal: Number(toSave.subtotal || 0),
      itbis: Number(toSave.itbis || 0),
      otros_cargos: 0,
      total: Number(toSave.total || 0),
      monto_pagado: Number(toSave.monto_pagado || 0),
      saldo_pendiente: Number(toSave.saldo_pendiente || 0),
      estado_pago: toSave.estado || "PENDIENTE",
      estado_mora: getEstadoMoraCXP(toSave.fecha_vencimiento, toSave.saldo_pendiente),
      dias_credito: Number(toSave.plazo_dias || 30),
      categoria_gasto: toSave.categoria_gasto || "INSUMOS",
      comprobante_url: toSave.comprobante_url || null,
      notas: toSave.descripcion || (toSave as any).notas || null,
      creado_por: toSave.creado_por || null,
      creado_en: toSave.creado_en || new Date().toISOString(),
      actualizado_en: toSave.actualizado_en,
    };
    const { error } = await supabase.from("facturas_cxp").upsert(payload);
    if (error) {
      console.error("saveFacturaCXP supabase error:", error);
    }
  } catch (e) {
    console.warn("saveFacturaCXP supabase error:", e);
  }
}

export async function deleteFacturaCXP(id: string, tenantId: string): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<FacturaCXP[]>(KEY.facturas_cxp, []);
  write(
    KEY.facturas_cxp,
    allLocal.filter((f) => !(f.id === id && (f.tenant_id === realId || f.tenant_id === tenantId))),
  );

  try {
    const { error } = await supabase.from("facturas_cxp").delete().eq("id", id).eq("tenant_id", realId);
    if (error) {
      console.error("deleteFacturaCXP supabase error:", error);
    }
  } catch (e) {
    console.warn("deleteFacturaCXP supabase error:", e);
  }
}

export async function getAbonosCXP(tenantId: string, facturaId?: string): Promise<AbonoFacturaCXP[]> {
  const realId = resolveTenantId(tenantId);
  let local = read<AbonoFacturaCXP[]>(KEY.abonos_cxp, []).filter(
    (a) => a.tenant_id === realId || a.tenant_id === tenantId,
  );
  if (facturaId) {
    local = local.filter((a) => a.factura_cxp_id === facturaId);
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    let query = supabase.from("abonos_cxp").select("*").eq("tenant_id", realId);
    if (facturaId) {
      query = query.eq("factura_cxp_id", facturaId);
    }
    const fetchPromise = query.order("creado_en", { ascending: false });
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const mapped: AbonoFacturaCXP[] = data.map((item: any) => ({
        id: item.id,
        tenant_id: item.tenant_id,
        factura_cxp_id: item.factura_cxp_id,
        suplidor_id: item.suplidor_id,
        empleado_id: item.creado_por || item.empleado_id || "admin",
        monto: Number(item.monto || 0),
        metodo_pago: item.metodo_pago,
        banco_origen: item.banco_origen,
        referencia_bancaria: item.referencia_bancaria,
        caja_id: item.caja_id,
        notas: item.notas,
        fecha_pago: item.fecha_pago,
        creado_en: item.creado_en,
      }));

      const allLocal = read<AbonoFacturaCXP[]>(KEY.abonos_cxp, []);
      const others = allLocal.filter(
        (a) =>
          !(
            (a.tenant_id === realId || a.tenant_id === tenantId) &&
            (!facturaId || a.factura_cxp_id === facturaId)
          ),
      );
      write(KEY.abonos_cxp, [...mapped, ...others]);
      return mapped;
    }
  } catch (e) {
    console.warn("getAbonosCXP error:", e);
  }

  return local;
}

export async function saveAbonoCXP(abono: AbonoFacturaCXP): Promise<void> {
  const realId = resolveTenantId(abono.tenant_id);
  const toSave = { ...abono, tenant_id: realId };

  const allLocal = read<AbonoFacturaCXP[]>(KEY.abonos_cxp, []);
  allLocal.unshift(toSave);
  write(KEY.abonos_cxp, allLocal);

  const facturas = await getFacturasCXP(realId);
  const factura = facturas.find((f) => f.id === toSave.factura_cxp_id);
  if (factura) {
    const nuevoMontoPagado = +(Number(factura.monto_pagado || 0) + Number(toSave.monto)).toFixed(2);
    const nuevoSaldo = Math.max(0, +(Number(factura.total) - nuevoMontoPagado).toFixed(2));
    const nuevoEstado: EstadoFacturaCXP =
      nuevoSaldo <= 0 ? "PAGADA" : nuevoMontoPagado > 0 ? "PARCIAL" : "PENDIENTE";

    const facturaActualizada: FacturaCXP = {
      ...factura,
      monto_pagado: nuevoMontoPagado,
      saldo_pendiente: nuevoSaldo,
      estado: nuevoEstado,
      actualizado_en: new Date().toISOString(),
    };
    await saveFacturaCXP(facturaActualizada);
  }

  try {
    const payload = {
      id: toSave.id,
      tenant_id: realId,
      factura_cxp_id: toSave.factura_cxp_id,
      suplidor_id: toSave.suplidor_id,
      monto: Number(toSave.monto),
      fecha_pago: toSave.fecha_pago,
      metodo_pago: toSave.metodo_pago,
      banco_origen: toSave.banco_origen || null,
      referencia_bancaria: toSave.referencia_bancaria || null,
      comprobante_url: (toSave as any).comprobante_url || null,
      notas: toSave.notas || null,
      caja_id: toSave.caja_id || null,
      creado_por: toSave.empleado_id || (toSave as any).creado_por || null,
      creado_en: toSave.creado_en || new Date().toISOString(),
    };
    const { error } = await supabase.from("abonos_cxp").insert(payload);
    if (error) {
      console.error("saveAbonoCXP supabase error:", error);
    }
  } catch (e) {
    console.warn("saveAbonoCXP supabase error:", e);
  }
}

// ============================================================
// NÓMINA DE EMPLEADOS — Cálculos Legales RD & Almacenamiento
// ============================================================

export function calcularTSS(salarioBase: number): { afp: number; sfs: number; totalTSS: number } {
  if (!salarioBase || salarioBase <= 0) return { afp: 0, sfs: 0, totalTSS: 0 };
  const afp = +(salarioBase * 0.0287).toFixed(2);
  const sfs = +(salarioBase * 0.0304).toFixed(2);
  const totalTSS = +(afp + sfs).toFixed(2);
  return { afp, sfs, totalTSS };
}

export function calcularISRDGII(salarioMensual: number, deduccionTSS: number = 0): number {
  const salarioNetoMensual = Math.max(0, salarioMensual - deduccionTSS);
  const rentaAnual = salarioNetoMensual * 12;

  let impuestoAnual = 0;
  if (rentaAnual <= 416220) {
    impuestoAnual = 0;
  } else if (rentaAnual <= 624329) {
    impuestoAnual = (rentaAnual - 416220) * 0.15;
  } else if (rentaAnual <= 867123) {
    impuestoAnual = 31216 + (rentaAnual - 624329) * 0.20;
  } else {
    impuestoAnual = 79776 + (rentaAnual - 867123) * 0.25;
  }

  return +(impuestoAnual / 12).toFixed(2);
}

export function calcularRegaliaPascual(totalGanadoAno: number): number {
  if (!totalGanadoAno || totalGanadoAno <= 0) return 0;
  return +(totalGanadoAno / 12).toFixed(2);
}

/**
 * Cálculo oficial de Hora Extra en República Dominicana (Código de Trabajo Ley 16-92, Art. 203)
 * - Salario Diario = Salario Mensual / 23.83 (factor legal oficial DGII y Ministerio de Trabajo)
 * - Hora Ordinaria = Salario Diario / 8 horas de jornada legal
 * - Hora Extra Regular (+35% de recargo legal) = Hora Ordinaria * 1.35
 */
export function calcularTarifaHoraExtra(salarioMensual: number): {
  salarioDiario: number;
  horaOrdinaria: number;
  horaExtra35: number;
} {
  if (!salarioMensual || salarioMensual <= 0) {
    return { salarioDiario: 0, horaOrdinaria: 0, horaExtra35: 0 };
  }
  const salarioDiario = +(salarioMensual / 23.83).toFixed(2);
  const horaOrdinaria = +(salarioDiario / 8).toFixed(2);
  const horaExtra35 = +(horaOrdinaria * 1.35).toFixed(2);
  return { salarioDiario, horaOrdinaria, horaExtra35 };
}

export function calcularValorHoraExtraRD(
  salarioMensual: number,
  horasExtras: number = 0,
  esFeriado: boolean = false
): { valorHoraNormal: number; valorHoraExtra: number; totalPagarHorasExtras: number } {
  if (!salarioMensual || salarioMensual <= 0 || !horasExtras || horasExtras <= 0) {
    return { valorHoraNormal: 0, valorHoraExtra: 0, totalPagarHorasExtras: 0 };
  }
  const salarioDiario = salarioMensual / 23.83;
  const valorHoraNormal = +(salarioDiario / 8).toFixed(2);
  const factor = esFeriado ? 2.0 : 1.35;
  const valorHoraExtra = +(valorHoraNormal * factor).toFixed(2);
  const totalPagarHorasExtras = +(valorHoraExtra * horasExtras).toFixed(2);

  return { valorHoraNormal, valorHoraExtra, totalPagarHorasExtras };
}

export async function getAnticiposNomina(
  tenantId: string,
  empleadoId?: string,
): Promise<AnticipoNomina[]> {
  const realId = resolveTenantId(tenantId);
  let local = read<AnticipoNomina[]>(KEY.anticipos_nomina, []).filter(
    (a) => a.tenant_id === realId || a.tenant_id === tenantId,
  );
  if (empleadoId) {
    local = local.filter((a) => a.empleado_id === empleadoId);
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    let query = supabase.from("anticipos_nomina").select("*").eq("tenant_id", realId);
    if (empleadoId) {
      query = query.eq("empleado_id", empleadoId);
    }
    const fetchPromise = query.order("fecha", { ascending: false });
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const emps = await getEmpleados(realId);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const mapped: AnticipoNomina[] = data.map((item: any) => ({
        ...item,
        empleado: empMap.get(item.empleado_id) || item.empleados || undefined,
      }));
      const allLocal = read<AnticipoNomina[]>(KEY.anticipos_nomina, []);
      const others = allLocal.filter(
        (a) =>
          !(
            (a.tenant_id === realId || a.tenant_id === tenantId) &&
            (!empleadoId || a.empleado_id === empleadoId)
          ),
      );
      write(KEY.anticipos_nomina, [...mapped, ...others]);
      return mapped;
    }
  } catch (e) {
    console.warn("getAnticiposNomina error:", e);
  }

  return local;
}

export async function saveAnticipoNomina(anticipo: AnticipoNomina): Promise<void> {
  const realId = resolveTenantId(anticipo.tenant_id);
  const toSave = { ...anticipo, tenant_id: realId };

  const allLocal = read<AnticipoNomina[]>(KEY.anticipos_nomina, []);
  const idx = allLocal.findIndex((a) => a.id === toSave.id);
  if (idx >= 0) {
    allLocal[idx] = toSave;
  } else {
    allLocal.unshift(toSave);
  }
  write(KEY.anticipos_nomina, allLocal);

  try {
    const { empleado, ...payload } = toSave as any;
    await supabase.from("anticipos_nomina").upsert(payload);
  } catch (e) {
    console.warn("saveAnticipoNomina supabase error:", e);
  }
}

export async function deleteAnticipoNomina(id: string, tenantId: string): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<AnticipoNomina[]>(KEY.anticipos_nomina, []);
  write(
    KEY.anticipos_nomina,
    allLocal.filter((a) => !(a.id === id && (a.tenant_id === realId || a.tenant_id === tenantId))),
  );

  try {
    await supabase.from("anticipos_nomina").delete().eq("id", id).eq("tenant_id", realId);
  } catch (e) {
    console.warn("deleteAnticipoNomina supabase error:", e);
  }
}

export async function getPeriodosNomina(tenantId: string): Promise<PeriodoNomina[]> {
  const realId = resolveTenantId(tenantId);
  const local = read<PeriodoNomina[]>(KEY.periodos_nomina, []).filter(
    (p) => p.tenant_id === realId || p.tenant_id === tenantId,
  );

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    const fetchPromise = supabase
      .from("periodos_nomina")
      .select("*")
      .eq("tenant_id", realId)
      .order("fecha_inicio", { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (!error && data) {
      const allLocal = read<PeriodoNomina[]>(KEY.periodos_nomina, []);
      const others = allLocal.filter((p) => p.tenant_id !== realId && p.tenant_id !== tenantId);
      write(KEY.periodos_nomina, [...data, ...others]);
      return data;
    }
  } catch (e) {
    console.warn("getPeriodosNomina error:", e);
  }

  return local;
}

export async function savePeriodoNomina(periodo: PeriodoNomina): Promise<void> {
  const realId = resolveTenantId(periodo.tenant_id);
  const toSave = { ...periodo, tenant_id: realId, actualizado_en: new Date().toISOString() };

  const allLocal = read<PeriodoNomina[]>(KEY.periodos_nomina, []);
  const idx = allLocal.findIndex((p) => p.id === toSave.id);
  if (idx >= 0) {
    allLocal[idx] = toSave;
  } else {
    allLocal.unshift(toSave);
  }
  write(KEY.periodos_nomina, allLocal);

  try {
    await supabase.from("periodos_nomina").upsert(toSave);
  } catch (e) {
    console.warn("savePeriodoNomina supabase error:", e);
  }
}

export async function deletePeriodoNomina(id: string, tenantId: string): Promise<void> {
  const realId = resolveTenantId(tenantId);
  const allLocal = read<PeriodoNomina[]>(KEY.periodos_nomina, []);
  write(
    KEY.periodos_nomina,
    allLocal.filter((p) => !(p.id === id && (p.tenant_id === realId || p.tenant_id === tenantId))),
  );

  const allDetalles = read<DetalleNomina[]>(KEY.detalles_nomina, []);
  write(
    KEY.detalles_nomina,
    allDetalles.filter((d) => d.periodo_id !== id),
  );

  try {
    await supabase.from("periodos_nomina").delete().eq("id", id).eq("tenant_id", realId);
  } catch (e) {
    console.warn("deletePeriodoNomina supabase error:", e);
  }
}

export async function getDetallesNomina(tenantId: string, periodoId?: string): Promise<DetalleNomina[]> {
  const realId = resolveTenantId(tenantId);
  let local = read<DetalleNomina[]>(KEY.detalles_nomina, []).filter(
    (d) => d.tenant_id === realId || d.tenant_id === tenantId,
  );
  if (periodoId) {
    local = local.filter((d) => d.periodo_id === periodoId);
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    let query = supabase.from("detalles_nomina").select("*").eq("tenant_id", realId);
    if (periodoId) {
      query = query.eq("periodo_id", periodoId);
    }
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2500),
    );
    const { data, error } = await Promise.race([query, timeoutPromise]);

    if (!error && data) {
      const emps = await getEmpleados(realId);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const mapped: DetalleNomina[] = data.map((item: any) => ({
        ...item,
        empleado: empMap.get(item.empleado_id) || item.empleados || undefined,
      }));
      const allLocal = read<DetalleNomina[]>(KEY.detalles_nomina, []);
      const others = allLocal.filter(
        (d) =>
          !(
            (d.tenant_id === realId || d.tenant_id === tenantId) &&
            (!periodoId || d.periodo_id === periodoId)
          ),
      );
      write(KEY.detalles_nomina, [...mapped, ...others]);
      return mapped;
    }
  } catch (e) {
    console.warn("getDetallesNomina error:", e);
  }

  return local;
}

export async function saveDetallesNomina(detalles: DetalleNomina[]): Promise<void> {
  if (!detalles || detalles.length === 0) return;
  const realId = resolveTenantId(detalles[0].tenant_id);

  const allLocal = read<DetalleNomina[]>(KEY.detalles_nomina, []);
  const updated = allLocal.filter((d) => !detalles.some((item) => item.id === d.id));
  detalles.forEach((d) => updated.push({ ...d, tenant_id: realId }));
  write(KEY.detalles_nomina, updated);

  try {
    const payload = detalles.map((d) => {
      const { empleado, ...rest } = d as any;
      return { ...rest, tenant_id: realId };
    });
    const { error } = await supabase.from("detalles_nomina").upsert(payload);
    if (error) {
      if (error.message?.includes("cantidad_horas_extras") || (error as any).code === "PGRST204") {
        const fallbackPayload = payload.map(({ cantidad_horas_extras, ...rest }: any) => rest);
        await supabase.from("detalles_nomina").upsert(fallbackPayload);
      } else {
        console.warn("saveDetallesNomina supabase error:", error);
      }
    }
  } catch (e) {
    console.warn("saveDetallesNomina supabase error:", e);
  }
}

/**
 * Purga automática de fotos de comprobante de entrega (POD) con más de 7 días.
 * Elimina los archivos físicos del bucket de Storage para evitar saturación de espacio,
 * y limpia el campo pod_foto en la tabla ordenes manteniendo la auditoría (quién y fecha).
 */
export async function purgeOldPodImages(tenantId?: string): Promise<{ deleted: number }> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("ordenes")
      .select("id, pod_foto, pod_fecha")
      .not("pod_foto", "is", null)
      .lt("pod_fecha", sevenDaysAgo)
      .limit(50);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: oldOrders, error } = await query;
    if (error || !oldOrders || oldOrders.length === 0) {
      return { deleted: 0 };
    }

    const pathsToRemove: string[] = [];
    const orderIdsToUpdate: string[] = [];

    for (const order of oldOrders) {
      if (order.pod_foto) {
        orderIdsToUpdate.push(order.id);
        const match = order.pod_foto.match(/catalogo\/(pod\/.+)$/);
        if (match && match[1]) {
          pathsToRemove.push(match[1]);
        }
      }
    }

    if (pathsToRemove.length > 0) {
      await supabase.storage.from("catalogo").remove(pathsToRemove);
      console.log(`[POD Auto-Purge] ${pathsToRemove.length} fotos con más de 7 días eliminadas de Storage.`);
    }

    if (orderIdsToUpdate.length > 0) {
      await supabase
        .from("ordenes")
        .update({ pod_foto: null })
        .in("id", orderIdsToUpdate);
      console.log(`[POD Auto-Purge] ${orderIdsToUpdate.length} órdenes actualizadas con pod_foto: null.`);
    }

    return { deleted: pathsToRemove.length };
  } catch (err) {
    console.warn("[POD Auto-Purge] Error purgando fotos antiguas:", err);
    return { deleted: 0 };
  }
}
