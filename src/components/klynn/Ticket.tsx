import type { Orden, Tenant, Empleado, Cliente, Servicio } from "@/lib/storage";
import { formatRD, formatNumber, formatDateTimeRD, formatDateRD, NCF_NOMBRES } from "@/lib/storage";
import { QRCodeSVG } from "qrcode.react";
import {
  ClipboardList,
  User,
  Phone,
  MapPin,
  Calendar,
  Shirt,
  FileText,
  WashingMachine,
  Tag,
  Package,
  Calculator,
  Percent,
  CircleDollarSign,
  CreditCard,
  BadgePercent,
  Truck,
  List,
} from "lucide-react";

interface Props {
  orden: Orden;
  tenant: Tenant;
  empleado: Empleado;
  cliente: Cliente;
  formato?: "57mm" | "80mm";
  pagoRecibido?: number;
  serviciosList?: Servicio[];
  ocultarUbicacion?: boolean;
  ocultarNotas?: boolean;
  esProduccion?: boolean;
  esCopiaCaja?: boolean;
}

function humanizeDate(dateStr: string, showTime = true): string {
  const d = new Date(dateStr);
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = dDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (!showTime) {
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (diffDays === 0) return `Hoy a las ${timeStr}`;
  if (diffDays === 1) return `Mañana a las ${timeStr}`;
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatPhoneDO(phoneStr?: string): string {
  if (!phoneStr || phoneStr === "---") return "";
  const digits = phoneStr.replace(/\D/g, "");
  const cleanDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  return phoneStr;
}

/**
 * Ticket imprimible térmico con diseño estilizado y estructurado.
 */
export function Ticket({
  orden,
  tenant,
  empleado,
  cliente,
  formato = "80mm",
  pagoRecibido,
  serviciosList = [],
  ocultarUbicacion = false,
  ocultarNotas = false,
  esProduccion = false,
  esCopiaCaja = false
}: Props) {
  const cfg = tenant.config;
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  const vuelto = pagoRecibido && pagoRecibido > orden.total ? pagoRecibido - orden.total : 0;

  // Detección de comprobante electrónico (e-CF)
  const isECF = !!(orden.tipo_ecf?.startsWith("E") || orden.ncf?.startsWith("E"));
  const ecfStatus = String((orden as any).ecf_status || '').toUpperCase();
  const isRejectedECF = isECF && (ecfStatus === 'REJECTED' || ecfStatus === 'ERROR');
  const isAcceptedECF = isECF && !isRejectedECF && (
    ecfStatus === 'ACCEPTED' || 
    ecfStatus === 'ACCEPTED_WITH_OBSERVATIONS' || 
    ecfStatus === 'REGISTERED' || 
    ecfStatus === 'SIGNED' || 
    ecfStatus === 'DELIVERED' ||
    (!!orden.ecf_qr && orden.ecf_qr !== "null" && orden.ecf_qr.length > 5)
  );
  const isPendingECF = isECF && !isRejectedECF && !isAcceptedECF;

  const actualQR = orden.ecf_qr === "null" ? "" : (orden.ecf_qr || "");
  const qrData = isAcceptedECF ? actualQR : "";

  let tipoDocumento = "FACTURA DE CONSUMO";
  if (!esProduccion) {
    if (orden.nota_credito_ncf) {
      tipoDocumento = isECF ? "NOTA DE CRÉDITO ELECTRÓNICA" : "NOTA DE CRÉDITO";
    } else if (isRejectedECF) {
      tipoDocumento = "COMPROBANTE RECHAZADO - NO VÁLIDO";
    } else if (isPendingECF) {
      tipoDocumento = (orden.tipo_ecf === "E31" || orden.ncf?.startsWith("E31") || orden.ncf?.startsWith("B01")) 
        ? "PRE-FACTURA CRÉDITO FISCAL" 
        : "PRE-FACTURA CONSUMIDOR FINAL";
    } else if (orden.ncf) {
      const prefix = orden.ncf.substring(0, 3);
      const nombreOficial = NCF_NOMBRES[prefix];
      
      if (nombreOficial) {
        if (prefix === "B02" || prefix === "E32") {
          tipoDocumento = isECF ? "FACTURA DE CONSUMO ELECTRÓNICA" : "FACTURA PARA CONSUMIDOR FINAL";
        } else if (prefix === "B01" || prefix === "E31") {
          tipoDocumento = isECF ? "FACTURA DE CRÉDITO FISCAL ELECTRÓNICA" : "FACTURA DE CRÉDITO FISCAL";
        } else {
          tipoDocumento = isECF ? `FACTURA DE ${nombreOficial} ELECTRÓNICA` : `FACTURA DE ${nombreOficial}`;
        }
      } else {
        tipoDocumento = isECF ? "FACTURA ELECTRÓNICA" : "COMPROBANTE FISCAL";
      }
    }
  }

  const srvListSafe = serviciosList || [];
  const totalPrendas = (orden.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0);

  // =========================================================================
  // ★ FORMATO DEDICADO PARA COPIA DE PRODUCCIÓN / USO INTERNO (TALLER) ★
  // =========================================================================
  if (esProduccion) {
    return (
      <div
        className={`thermal-ticket mx-auto ${w} ${cols} bg-white pl-2.5 pr-6 py-2 text-[10.5px] leading-tight text-black`}
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="text-center space-y-0.5 mb-1">
          {tenant.logo_url && (
            <div className="flex justify-center mb-0">
              <img src={tenant.logo_url} alt="Logo" className="h-16 w-auto max-w-[180px] object-contain filter grayscale" />
            </div>
          )}
          {!tenant.logo_url && <div className="text-base font-bold uppercase leading-tight">{tenant.nombre}</div>}
        </div>

        <div className="text-center font-bold uppercase text-[10.5px] py-0.5 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE USO INTERNO ★
        </div>

        {orden.ubicacion_ropa && (
          <div className="my-1 p-1 border border-black bg-black/5 text-center">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-black">UBICACIÓN:</div>
            <div className="text-[13px] font-bold uppercase">{orden.ubicacion_ropa}</div>
          </div>
        )}

        <div className="my-1.5 rounded-md border border-black py-1 px-2.5 flex items-center">
          <div className="flex-1 flex items-center justify-center gap-2 font-bold text-[10.5px] uppercase tracking-wide">
            <Package className="h-4 w-4 shrink-0 text-black" />
            <span>TOTAL DE PRENDAS:</span>
          </div>
          <div className="h-4 w-px bg-black/40" />
          <div className="w-16 flex items-center justify-center font-bold text-[15px]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            {totalPrendas}
          </div>
        </div>

        <div className="my-1.5 py-1.5 border-y-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-5 w-5 text-black shrink-0" />
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-black/70">ORDEN N.°</div>
              <div className="text-lg font-bold tracking-tight leading-none tabular-nums">{orden.numero}</div>
            </div>
          </div>
          {orden.es_urgente && (
            <span className="font-bold text-white bg-black px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider rounded-xs">
              ★ URGENTE ★
            </span>
          )}
        </div>

        <div className="space-y-0.5 text-[10.5px]">
          <div className="flex items-start justify-between gap-1 py-1 border-b border-dotted border-black/40">
            <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
              <User className="h-3 w-3 text-black" />
              <span>CLIENTE:</span>
            </div>
            <span className="font-semibold text-right text-black">
              {cliente.nombre} {cliente.apellido || ""}
            </span>
          </div>

          {cliente.telefono && cliente.telefono !== "---" && (
            <div className="flex items-center justify-between gap-1 py-1 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
                <Phone className="h-3 w-3 text-black" />
                <span>TELÉFONO:</span>
              </div>
              <span className="font-semibold text-right text-black tabular-nums">{formatPhoneDO(cliente.telefono)}</span>
            </div>
          )}

          {(cliente.direccion || orden.direccion_entrega) && (
            <div className="flex items-start justify-between gap-1 py-1 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
                <MapPin className="h-3 w-3 text-black" />
                <span>DIRECCIÓN:</span>
              </div>
              <span className="font-normal text-right text-[9.5px] leading-tight text-black max-w-[60%]">
                {cliente.direccion || orden.direccion_entrega}
              </span>
            </div>
          )}

          <div className="py-1 border-b border-dotted border-black/40 text-center">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-black flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-black" />
              <span>FECHA DE ENTREGA:</span>
            </div>
            <div className="text-[13px] font-bold text-black mt-0.5 tracking-tight">
              {humanizeDate(orden.fecha_entrega, true)}
            </div>
          </div>

          <div className="py-1 border-b border-dotted border-black/40">
            <div className="flex items-center gap-1 font-bold uppercase text-black mb-0.5">
              <Shirt className="h-3 w-3 text-black" />
              <span>SERVICIOS Y PRENDAS:</span>
            </div>
            <div className="space-y-0.5 pl-2">
              {orden.servicios?.map((sName, i) => {
                const itemsDesglosados = (orden.items || []).filter((it) => it.descripcion.startsWith("↳"));
                const misPrendas = itemsDesglosados.filter((it) =>
                  it.servicio_origen
                    ? it.servicio_origen === sName
                    : it.descripcion.toLowerCase().includes(sName.toLowerCase()) || orden.servicios?.length === 1
                );

                return (
                  <div key={'prod-srv-' + i} className="mb-1">
                    <div className="font-bold text-[10.5px] text-black uppercase">
                      ★ {sName}
                    </div>
                    {misPrendas.map((it, dIdx) => (
                      <div key={'prod-item-' + dIdx} className="pl-1.5 text-[9.5px]">
                        <span className="font-medium text-black">
                          • {it.cantidad} × {it.descripcion.replace(/^↳\s*/, "")}{it.es_libra ? ` (${it.cantidad} lb)` : ""}
                        </span>
                        {it.notas && (
                          <div className="text-[8.5px] font-bold text-black italic pl-1.5">
                            ⚠️ Nota: {it.notas}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {(orden.items || [])
                .filter((it) => !it.descripcion.startsWith("↳"))
                .map((it, i) => (
                  <div key={'prod-suelto-' + i} className="text-[9.5px]">
                    <span className="font-medium text-black">
                      • {it.cantidad} × {it.descripcion}{it.es_libra ? ` (${it.cantidad} lb)` : ""}
                    </span>
                    {it.notas && (
                      <div className="text-[8.5px] font-bold text-black italic pl-1.5">
                        ⚠️ Nota: {it.notas}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {orden.notas && (
            <div className="py-1 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1 font-bold uppercase text-black mb-0.5">
                <FileText className="h-3 w-3 text-black" />
                <span>NOTAS:</span>
              </div>
              <div className="font-bold text-left text-[10px] leading-snug text-black whitespace-pre-line pl-4">
                {orden.notas}
              </div>
            </div>
          )}

          {cfg?.ticket_mostrar_empleado && (
            <div className="my-1.5 p-1 border border-black bg-black/5 text-center">
              <div className="text-[10px] font-bold text-black flex items-center justify-center gap-1">
                <User className="h-3 w-3 text-black" />
                <span>Atendido por:</span>
              </div>
              <div className="text-[12px] font-bold text-black mt-0.5">
                {empleado.nombre}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ★ FORMATO COMERCIAL / FISCAL / CLIENTE (DISEÑO ESTILIZADO CON MARGEN DERECHO SEGURO) ★
  // =========================================================================
  return (
    <div
      className={`thermal-ticket mx-auto ${w} ${cols} bg-white pl-2.5 pr-6 py-2 text-[11px] leading-snug text-black`}
      style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* 1. ENCABEZADO / LOGO */}
      <div className="text-center space-y-0.5">
        {tenant.logo_url ? (
          <div className="flex justify-center mb-0">
            <img src={tenant.logo_url} alt="Logo" className="h-16 w-auto max-w-[180px] object-contain filter grayscale" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold tracking-tight">{tenant.nombre || "Klynn"}</div>
            <div className="text-[10px] text-black/80 font-medium italic">tu lavandería, simplificada</div>
          </div>
        )}
        {(cfg?.ticket_mostrar_rnc ?? true) && (tenant.rnc || (cfg as any)?.rnc_emisor) && (
          <div className="text-[10px]"><b>RNC:</b> <span className="font-semibold tabular-nums">{tenant.rnc || (cfg as any)?.rnc_emisor}</span></div>
        )}
        {tenant.telefono && <div className="text-[10px]"><b>Tel:</b> <span className="font-semibold tabular-nums">{formatPhoneDO(tenant.telefono)}</span></div>}
        {tenant.direccion && <div className="text-[9.5px] leading-tight font-semibold text-black/80">{tenant.direccion}</div>}
      </div>

      <Sep />

      {/* 2. ESTADO PRINCIPAL DE FACTURA */}
      <div className="text-center font-extrabold uppercase text-[12px] py-0.5 tracking-wider">
        {orden.saldo === 0 ? "★ FACTURA PAGADA ★" : `⚠️ PENDIENTE: ${formatRD(orden.saldo)}`}
      </div>
      {esCopiaCaja && (
        <div className="text-center font-extrabold uppercase text-[10px] py-0.5 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE CAJA ★
        </div>
      )}

      <Sep />

      {/* 3. METADATOS DE LA ORDEN CON ICONOS */}
      <div className="space-y-1 text-[11px] pr-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-black" />
            <span><b>Orden No°:</b> <span className="font-bold tabular-nums ml-0.5">{orden.numero}</span></span>
          </div>
          {orden.es_urgente && (
            <span className="font-bold text-[9px] bg-black text-white px-1.5 py-0.5 rounded-xs uppercase shrink-0">
              ★ URGENTE ★
            </span>
          )}
        </div>

        {orden.nota_credito_ncf ? (
          <>
            <div className="flex items-center gap-1.5 text-destructive font-bold">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span><b>{isECF ? 'e-NCF Mod.:' : 'NCF Mod.:'}</b> <span className="tabular-nums ml-0.5">{orden.nota_credito_ncf}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span><b>Doc. Mod.:</b> <span className="tabular-nums ml-0.5">{orden.ncf}</span></span>
            </div>
          </>
        ) : (
          orden.ncf && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
              <span><b>{isECF ? "e-NCF:" : "NCF:"}</b> <span className="font-bold tabular-nums ml-0.5">{orden.ncf}</span></span>
            </div>
          )
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
          <span><b>Fecha Emisión:</b> <span className="font-semibold tabular-nums ml-0.5">{formatDateTimeRD(orden.creado_en)}</span></span>
        </div>

        {orden.notas && ((cfg?.ticket_mostrar_notas || esCopiaCaja) && !ocultarNotas) && (
          <div className="border border-black px-1.5 py-0.5 my-1 text-[10px] leading-tight bg-black/5">
            <b>NOTA:</b> {orden.notas}
          </div>
        )}
      </div>

      {/* SECCIÓN: DATOS DEL CLIENTE */}
      {cliente && cliente.nombre !== "Consumidor" && (
        <>
          <Sep />
          <div className="text-center font-bold tracking-widest text-[11px] uppercase py-0.5">
            DATOS DEL CLIENTE
          </div>
          <Sep />
          <div className="space-y-1 text-[11px] pr-2">
            <div className="flex items-start gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
              <div>
                <b>Cliente:</b> <span className="font-semibold ml-0.5">{cliente.nombre} {cliente.apellido || ""}</span>
              </div>
            </div>

            {cliente.cedula && (
              <div className="flex items-start gap-1.5 text-[10px]">
                <CreditCard className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div>
                  <b>{cliente.tipo === 'Empresa' ? 'RNC:' : 'Cédula:'}</b> <span className="font-semibold tabular-nums ml-0.5">{cliente.cedula}</span>
                </div>
              </div>
            )}

            {cliente.telefono && cliente.telefono !== "---" && (
              <div className="flex items-start gap-1.5 text-[10px]">
                <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div>
                  <b>Teléfono:</b> <span className="font-semibold tabular-nums ml-0.5">{formatPhoneDO(cliente.telefono)}</span>
                </div>
              </div>
            )}

            {cliente.direccion && (
              <div className="flex items-start gap-1.5 text-[10px] leading-tight">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div className="break-words">
                  <b>Dirección:</b> <span className="font-normal ml-0.5">{cliente.direccion}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Sep />

      {/* 4. ITEMS Y SERVICIOS CON PASTILLA REDONDEADA Y MARGEN DERECHO AMPLIADO */}
      <div>
        {(() => {
          const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0) + 
                                (orden.servicios?.map(s => orden.servicios_precios?.[s] !== undefined ? orden.servicios_precios[s] : (srvListSafe.find(x => x.nombre === s)?.precio || 0)).reduce((a,b) => a+b, 0) || 0);
          
          const isItbisIncluidoEnEstaOrden = cfg?.ncf_facturacion_activa && orden.itbis > 0 
                                            ? (subtotalBruto - orden.subtotal > 1) 
                                            : !!cfg?.itbis_incluido;

          const itemsSueltos = orden.items.filter(it => !it.descripcion.startsWith("↳"));
          const itemsDesglosados = orden.items.filter(it => it.descripcion.startsWith("↳"));

          return (
            <>
              {/* Servicios con caja de servicio redondeada */}
              {orden.servicios?.map((sName, i) => {
                const srv = srvListSafe.find(s => s.nombre === sName);
                const p = orden.servicios_precios?.[sName] !== undefined ? orden.servicios_precios[sName] : (srv ? srv.precio : 0);
                
                const misPrendasDesglosadas = itemsDesglosados.filter(it => 
                  it.servicio_origen 
                    ? it.servicio_origen === sName 
                    : (it.descripcion.toLowerCase().includes(sName.toLowerCase()) || 
                       (it.notas && it.notas.toLowerCase().includes(sName.toLowerCase())) ||
                       (orden.servicios.length === 1))
                );

                return (
                  <div key={'s'+i} className="mb-2.5">
                    {/* Caja de Servicio con Esquinas Suaves (rounded-md) */}
                    <div className="my-1.5 rounded-md bg-black text-white pl-2.5 pr-4 py-1 flex items-center justify-between text-[10.5px] uppercase tracking-wide">
                      <div className="flex items-center gap-1.5 font-bold shrink-0">
                        <WashingMachine className="h-3.5 w-3.5" />
                        <span className="text-[9.5px] tracking-wider">SERVICIO</span>
                      </div>
                      <div className="h-3.5 w-px bg-white/40 mx-2" />
                      <span className="font-bold truncate text-[10.5px] tracking-wide text-right">{sName}</span>
                    </div>

                    {/* Tabla de encabezados */}
                    <div className="flex justify-between items-center font-bold uppercase text-[9.5px] pb-1 border-b border-black text-black">
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <Shirt className="h-3.5 w-3.5 shrink-0" />
                        <span>DESCRIPCIÓN</span>
                      </div>
                      <div className="w-[20%] text-right flex items-center justify-end gap-0.5">
                        <BadgePercent className="h-3 w-3 shrink-0" />
                        <span>ITBIS</span>
                      </div>
                      <div className="w-[28%] text-right pr-3 flex items-center justify-end gap-0.5">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span>VALOR</span>
                      </div>
                    </div>

                    {/* Fila del servicio si tiene precio directo */}
                    {p > 0 && (
                      <div className="flex justify-between items-start py-1 border-b border-dotted border-black/30 font-medium">
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="font-bold text-[10.5px]">Servicio {sName}</div>
                          <div className="text-[9.5px] text-black/80 font-semibold tabular-nums">1 × {formatNumber(p)}</div>
                        </div>
                        <div className="w-[20%] text-right font-semibold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10px]">
                          {cfg?.ncf_facturacion_activa && orden.itbis > 0 ? formatNumber(p * ((cfg.itbis_porcentaje || 18) / 100)) : "0.00"}
                        </div>
                        <div className="w-[28%] text-right pr-3 font-bold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">
                          {formatNumber(p)}
                        </div>
                      </div>
                    )}

                    {/* Desgloses de prendas debajo del servicio */}
                    <div className="divide-y divide-dotted divide-black/30">
                      {misPrendasDesglosadas.map((it, dIdx) => {
                        let baseTotal = it.cantidad * (it.precio_unitario || 0);
                        let itemItbis = 0;
                        let valor = baseTotal;
                        if (cfg?.ncf_facturacion_activa && orden.itbis > 0 && !it.is_exento && baseTotal > 0) {
                          if (isItbisIncluidoEnEstaOrden) {
                            itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                          } else {
                            itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                            valor = baseTotal + itemItbis;
                          }
                        }

                        const cleanDesc = it.descripcion.replace(/^↳\s*/, "");
                        const cantPrefix = it.cantidad > 1 ? `${it.cantidad}x ` : "";

                        return (
                          <div key={'sd'+dIdx} className="flex justify-between items-start py-1">
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="font-semibold text-black text-[10.5px] leading-tight break-words">
                                {cantPrefix}{cleanDesc}{it.es_libra ? ` (${it.cantidad}lb)` : ""}
                              </div>
                              {it.color && <div className="text-[9px] text-black/80 font-medium">Color: {it.color}</div>}
                              {it.notas && <div className="text-[9px] italic leading-tight text-black/80 font-normal">Nota: {it.notas}</div>}
                            </div>
                            <div className="w-[20%] text-right font-semibold pt-0.5 text-black tabular-nums tracking-tight whitespace-nowrap text-[10px]">
                              {baseTotal > 0 ? (itemItbis > 0 ? formatNumber(itemItbis) : "0.00") : "—"}
                            </div>
                            <div className="w-[28%] text-right pr-3 font-bold pt-0.5 text-black tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">
                              {baseTotal > 0 ? formatNumber(valor) : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Prendas sueltas si no tienen servicio padre */}
              {itemsSueltos.length > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between items-center font-bold uppercase text-[9.5px] pb-1 border-b border-black text-black">
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <Shirt className="h-3.5 w-3.5 shrink-0" />
                      <span>DESCRIPCIÓN</span>
                    </div>
                    <div className="w-[20%] text-right flex items-center justify-end gap-0.5">
                      <BadgePercent className="h-3 w-3 shrink-0" />
                      <span>ITBIS</span>
                    </div>
                    <div className="w-[28%] text-right pr-3 flex items-center justify-end gap-0.5">
                      <Tag className="h-3 w-3 shrink-0" />
                      <span>VALOR</span>
                    </div>
                  </div>

                  <div className="divide-y divide-dotted divide-black/30">
                    {itemsSueltos.map((it, i) => {
                      let baseTotal = it.cantidad * it.precio_unitario;
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                        } else {
                          itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                          valor = baseTotal + itemItbis;
                        }
                      }
                      return (
                        <div key={'suelto'+i} className="flex justify-between items-start py-1">
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="font-semibold leading-tight text-[10.5px] break-words">{it.descripcion}{it.es_libra ? ` (${it.cantidad}lb)` : ""}</div>
                            {it.servicio_origen && (
                              <div className="text-[9px] font-bold text-black/80">↳ {it.servicio_origen}</div>
                            )}
                            <div className="text-[9.5px] text-black/80 font-semibold tabular-nums">{it.cantidad} × {formatNumber(it.precio_unitario)}</div>
                            {it.color && <div className="text-[9px] text-black/80 font-medium">Color: {it.color}</div>}
                            {it.notas && <div className="text-[9px] italic leading-tight text-black/80 font-normal">Nota: {it.notas}</div>}
                          </div>
                          <div className="w-[20%] text-right font-semibold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10px]">{itemItbis > 0 ? formatNumber(itemItbis) : "0.00"}</div>
                          <div className="w-[28%] text-right pr-3 font-bold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">{formatNumber(valor)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <Sep />

      {/* 5. RECUADRO DE TOTAL DE PRENDAS (ESQUINAS SUAVES Y MISMA FUENTE) */}
      <div className="my-2 rounded-md border border-black py-1 pl-2.5 pr-4 flex items-center">
        <div className="flex-1 flex items-center justify-center gap-2 font-bold text-[11px] uppercase tracking-wide">
          <Package className="h-4 w-4 shrink-0 text-black" />
          <span>TOTAL DE PRENDAS:</span>
        </div>
        <div className="h-4 w-px bg-black/40" />
        <div className="w-16 flex items-center justify-center font-bold text-[15px]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {totalPrendas}
        </div>
      </div>

      {/* 6. DESGLOSE FINANCIERO */}
      <div className="space-y-1 text-[11px] pt-1 pr-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Calculator className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Subtotal</span>
          </div>
          <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">{formatRD(orden.subtotal).replace("DOP", "RD$")}</span>
        </div>

        {cfg?.ncf_facturacion_activa && orden.itbis > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Percent className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>ITBIS {cfg?.itbis_porcentaje ?? 18}%</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">{formatRD(orden.itbis).replace("DOP", "RD$")}</span>
          </div>
        )}

        {orden.descuento > 0 && (
          <div className="flex justify-between items-center gap-2">
            <span className="font-semibold shrink-0">Descuento</span>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">-{formatRD(orden.descuento).replace("DOP", "RD$")}</span>
          </div>
        )}

        {orden.costo_envio && orden.costo_envio > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Truck className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Envío a domicilio</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">{formatRD(orden.costo_envio).replace("DOP", "RD$")}</span>
          </div>
        )}

        <div className="my-1 border-t-[1.5px] border-dashed border-black" />

        <div className="flex justify-between items-center py-0.5 gap-2">
          <div className="flex items-center gap-1.5 text-[12.5px] font-black tracking-tight shrink-0">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-black" />
            <span>TOTAL</span>
          </div>
          <span className="font-black text-[14.5px] tabular-nums tracking-tight whitespace-nowrap">{formatRD(orden.total).replace("DOP", "RD$")}</span>
        </div>
      </div>

      <Sep />

      {/* 7. DETALLES DE PAGO Y LOGÍSTICA */}
      <div className="space-y-1 text-[11px] pr-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Método de pago:</span>
          </div>
          <span className="font-semibold uppercase truncate">
            {orden.metodo_pago === "PAGO_AL_RETIRAR" ? "AL RETIRAR" : orden.metodo_pago === "CREDITO" ? "CRÉDITO" : orden.metodo_pago === "MIXTO" ? "MIXTO" : orden.metodo_pago}
          </span>
        </div>

        {orden.condicion_cobro === "ANTICIPO" && (
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-black/70">Modalidad:</span>
            <span className="font-semibold uppercase">ANTICIPO</span>
          </div>
        )}

        {orden.pagos_detalle && orden.pagos_detalle.length > 1 && (
          <div className="py-1 my-1 border-y border-dotted border-black/60 text-[9.5px]">
            <div className="font-bold uppercase text-[9px] text-black/70 mb-0.5">Desglose de cobro:</div>
            {orden.pagos_detalle.map((pd, pidx) => (
              <div key={pidx} className="flex justify-between font-medium">
                <span>• {pd.metodo}{pd.referencia ? ` (${pd.referencia})` : ""}:</span>
                <span className="font-semibold tabular-nums">{formatRD(pd.monto)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Estado de factura:</span>
          </div>
          <span className="font-black uppercase tracking-wide shrink-0">{orden.saldo === 0 ? "PAGADA" : "PENDIENTE"}</span>
        </div>

        {pagoRecibido !== undefined && (
          <>
            {orden.saldo === 0 && (pagoRecibido < orden.total || orden.pagado > pagoRecibido) ? (
              <>
                <Row k="Saldo pendiente" v="RD$0.00" bold />
                {vuelto > 0 && <Row k="Cambio" v={formatRD(vuelto).replace("DOP", "RD$")} boldValue />}
              </>
            ) : pagoRecibido < (orden.saldo + pagoRecibido) && pagoRecibido > 0 ? (
              <>
                <Row k="Abonado" v={formatRD(pagoRecibido).replace("DOP", "RD$")} bold />
                <Row k="Saldo restante" v={formatRD(orden.saldo).replace("DOP", "RD$")} bold />
              </>
            ) : (
              <>
                <Row k="Recibido" v={formatRD(pagoRecibido).replace("DOP", "RD$")} />
                {vuelto > 0 && <Row k="Cambio" v={formatRD(vuelto).replace("DOP", "RD$")} boldValue />}
              </>
            )}
          </>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Fecha de entrega:</span>
          </div>
          <span className="font-semibold truncate">{humanizeDate(orden.fecha_entrega, false)}</span>
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Package className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Estado de la orden:</span>
          </div>
          <span className="font-black uppercase tracking-wide truncate">{orden.estado.replace("_", " ")}</span>
        </div>
      </div>

      <Sep />

      {/* 8. ATENDIDO POR & PIE DE PÁGINA */}
      <div className="text-center py-0.5">
        <div className="text-[11px] font-bold text-black uppercase tracking-wide">Atendido por:</div>
        <div className="text-[14px] font-black text-black mt-0.5">{empleado.nombre}</div>
      </div>

      <Sep />

      <div className="text-center py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-black">
        {cfg?.ticket_pie ?? "¡Gracias por su preferencia!"}
      </div>

      <Sep />

      <div className="text-center text-[9.5px] leading-snug text-black font-bold tracking-tight">
        {cfg?.ticket_nota || "Ropa con más de 30 días será vendida por importe de trabajo."}
      </div>

      {/* 9. SECCIÓN FISCAL E-CF / QR DGII */}
      {isPendingECF && (
        <div className="mt-2 text-center text-[9.5px] font-bold border-t-[1.5px] border-dashed border-black/50 pt-1.5 leading-snug">
          Documento sujeto a timbrado e-CF.
        </div>
      )}

      {isRejectedECF && (
        <div className="mt-2 text-center text-[9.5px] font-black border-2 border-black p-1.5 leading-snug">
          DOCUMENTO RECHAZADO POR DGII. NO ES UN COMPROBANTE FISCAL VÁLIDO.
        </div>
      )}

      {isAcceptedECF && qrData && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="text-[9.5px] font-black uppercase text-center tracking-wide">
            {orden.ncf ? (NCF_NOMBRES[orden.ncf.substring(0, 3)] ? `Factura de ${NCF_NOMBRES[orden.ncf.substring(0, 3)]} Electrónica` : "Factura Electrónica") : ""}
          </div>
          <div className="p-1 bg-white">
            <QRCodeSVG value={qrData} size={100} level="M" />
          </div>
          <div className="text-[9px] text-center leading-snug font-bold text-black">
            {orden.ecf_security_code && orden.ecf_security_code !== "null" && (
              <div>Código de Seguridad: <span className="font-black">{orden.ecf_security_code}</span></div>
            )}
            {orden.ecf_signature_date && orden.ecf_signature_date !== "null" && (
              <div>Fecha Firma: <span className="font-semibold">{formatDateTimeRD(orden.ecf_signature_date)}</span></div>
            )}
          </div>
          <div className="text-[9px] text-center leading-tight font-bold text-black mt-1">
            Consulte su factura en:<br/>
            <span className="font-black">dgii.gov.do</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Sep() { return <div className="my-1.5 border-t-[1.5px] border-dashed border-black" />; }
function Row({ k, v, bold, boldValue }: { k: string; v: string; bold?: boolean; boldValue?: boolean }) {
  return (
    <div className={`flex justify-between text-[11px] ${bold ? "font-bold text-[12px]" : "font-semibold"}`}>
      <span className="font-semibold">{k}:</span>
      <span className={boldValue || bold ? "font-bold" : "font-semibold"}>{v}</span>
    </div>
  );
}
