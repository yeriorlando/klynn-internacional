import type { Orden, Tenant, Empleado, Cliente, Servicio } from "@/lib/storage";
import { formatMoney, formatRD, formatNumber, formatDateTimeRD, formatDateRD, NCF_NOMBRES, isModuleEnabled, getTenantCurrencySymbol } from "@/lib/storage";
import { formatEcfStatus } from "@/lib/fiscal";
import { SneakerIcon, isCalzadoItem } from "@/components/klynn/SneakerIcon";
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
  Landmark,
  Wallet,
  Coins,
  Hourglass,
  ArrowRightLeft,
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

  const hasFiscalModule = isModuleEnabled(tenant, "facturacion_fiscal");
  // Se muestra la columna y fila de ITBIS si la orden tiene ITBIS cobrado y la configuración lo permite
  const mostrarColumnaItbis = Boolean(orden.itbis && orden.itbis > 0) && (cfg?.mostrar_columna_itbis ?? true);

  // Detección de comprobante electrónico (e-CF): respeta órdenes históricas ya emitidas
  const isECF = !!(orden.tipo_ecf?.startsWith("E") || orden.ncf?.startsWith("E"));
  const isCreditNote = Boolean(orden.nota_credito_ncf);
  const isDebitNote = !isCreditNote && Boolean(orden.nota_debito_ncf);
  const fiscalNCF = isCreditNote ? orden.nota_credito_ncf : isDebitNote ? orden.nota_debito_ncf : orden.ncf;
  const fiscalQR = isCreditNote ? orden.nota_credito_qr : isDebitNote ? orden.nota_debito_qr : orden.ecf_qr;
  const fiscalSecurityCode = isCreditNote
    ? orden.nota_credito_codigo_seguridad
    : isDebitNote ? orden.nota_debito_codigo_seguridad : orden.ecf_security_code;
  const fiscalSignatureDate = isCreditNote
    ? orden.nota_credito_fecha_firma
    : isDebitNote ? orden.nota_debito_fecha_firma : orden.ecf_signature_date;
  const fiscalIssueDate = isCreditNote
    ? orden.nota_credito_fecha_emision
    : isDebitNote ? orden.nota_debito_fecha_emision : orden.creado_en;
  const ecfStatus = String(
    (isCreditNote ? orden.nota_credito_estado : isDebitNote ? orden.nota_debito_estado : orden.ecf_status) || '',
  ).toUpperCase();
  const isRejectedECF = isECF && (ecfStatus === 'REJECTED' || ecfStatus === 'ERROR');
  const isAcceptedECF = isECF && !isRejectedECF && (
    ecfStatus === 'ACCEPTED' || 
    ecfStatus === 'ACCEPTED_WITH_OBSERVATIONS' || 
    ecfStatus === 'REGISTERED' || 
    ecfStatus === 'SIGNED' || 
    ecfStatus === 'DELIVERED' ||
    !!fiscalSecurityCode ||
    (!!fiscalQR && fiscalQR !== "null" && fiscalQR.length > 5) ||
    fiscalNCF?.startsWith("E")
  );
  const isPendingECF = isECF && !isRejectedECF && !isAcceptedECF;

  const actualQR = fiscalQR === "null" ? "" : (fiscalQR || "");
  const fallbackQR = isAcceptedECF && fiscalNCF && tenant?.rnc ? (
    `https://fc.dgii.gov.do/ecf/consulta?rncemisor=${tenant.rnc.replace(/\D/g, '')}&encf=${fiscalNCF}&codigoSeguridad=${fiscalSecurityCode || ''}&montoTotal=${orden.total}`
  ) : "";
  const qrData = actualQR || fallbackQR;

  let tipoDocumento = "RECIBO DE ORDEN";
  if (!esProduccion && (hasFiscalModule || orden.ncf || orden.tipo_ecf)) {
    if (orden.nota_credito_ncf) {
      tipoDocumento = isECF ? "NOTA DE CRÉDITO ELECTRÓNICA" : "NOTA DE CRÉDITO";
    } else if (orden.nota_debito_ncf) {
      tipoDocumento = isECF ? "NOTA DE DÉBITO ELECTRÓNICA" : "NOTA DE DÉBITO";
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
  
  // Conteo de prendas: incluye ítems directos y piezas base de paquetes si no se desglosaron individualmente
  let piezasBasePaquetes = 0;
  (orden.servicios || []).forEach((sName) => {
    const srv = srvListSafe.find((s) => s.nombre === sName);
    if (srv?.permite_piezas_adicionales && (srv?.piezas_incluidas || 0) > 0) {
      const tienePrendasIndividuales = (orden.items || []).some(
        (it) =>
          it.servicio_origen === sName &&
          !it.descripcion.toLowerCase().includes("pieza adicional") &&
          !it.descripcion.toLowerCase().includes("piezas adicionales")
      );
      if (!tienePrendasIndividuales) {
        piezasBasePaquetes += srv.piezas_incluidas || 0;
      }
    }
  });

  const totalLibras = (orden.items || [])
    .filter((it) => it.es_libra)
    .reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  const totalPrendasPorLibra = (orden.items || [])
    .filter((it) => it.es_libra)
    .reduce((acc, it) => acc + (it.cantidad_prendas || 0), 0);

  // Conteo separado de Calzado (pares) y Piezas / Prendas de vestir
  const totalPares = (orden.items || [])
    .filter((it) => !it.descripcion.toLowerCase().startsWith("servicio:") && isCalzadoItem(it))
    .reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  const totalPiezas = (orden.items || [])
    .filter((it) => !it.descripcion.toLowerCase().startsWith("servicio:") && !isCalzadoItem(it))
    .reduce((acc, it) => {
      if (it.es_libra) {
        return acc + (it.cantidad_prendas && it.cantidad_prendas > 0 ? it.cantidad_prendas : 0);
      }
      if (it.es_metro_cuadrado) {
        return acc + (it.cantidad_prendas && it.cantidad_prendas > 0 ? it.cantidad_prendas : 1);
      }
      return acc + (Number(it.cantidad) || 0);
    }, 0) + piezasBasePaquetes;

  const isSoloCalzado = totalPares > 0 && totalPiezas === 0;
  const isMixto = totalPares > 0 && totalPiezas > 0;
  const weightUnit = (orden.items || []).find((it) => it.es_libra && it.unidad_peso)?.unidad_peso || "lb";
  const hayLibras = totalLibras > 0;
  const formattedLbs = `${+totalLibras.toFixed(2)} ${weightUnit}`;

  const ticketBadgeData = (() => {
    if (isSoloCalzado) {
      return {
        icon: <SneakerIcon className="h-4 w-4 shrink-0 text-black" strokeWidth={2} />,
        label: "TOTAL DE PARES:",
        value: String(totalPares),
        isMixto: false,
      };
    }
    if (isMixto) {
      const piezasStr = `${totalPiezas} ${totalPiezas === 1 ? "PIEZA" : "PIEZAS"}${hayLibras ? ` (${formattedLbs})` : ""}`;
      const paresStr = `${totalPares} ${totalPares === 1 ? "PAR" : "PARES"}`;
      return {
        icon: (
          <div className="flex items-center gap-1 shrink-0">
            <Shirt className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2} />
            <SneakerIcon className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2} />
          </div>
        ),
        label: "TOTAL:",
        value: `${piezasStr} · ${paresStr}`,
        isMixto: true,
      };
    }
    // Solo piezas / prendas convencionales
    const displayVal = (() => {
      if (hayLibras) {
        if (totalPrendasPorLibra > 0) return `${totalPiezas} (${formattedLbs})`;
        if (totalPiezas > 0) return `${totalPiezas} (${formattedLbs})`;
        return formattedLbs;
      }
      return String(totalPiezas);
    })();
    return {
      icon: <Shirt className="h-4 w-4 shrink-0 text-black" strokeWidth={2} />,
      label: "TOTAL DE PIEZAS:",
      value: displayVal,
      isMixto: false,
    };
  })();

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

        {orden.sucursal_origen_nombre && orden.sucursal_origen_id !== tenant.id && (
          <div className="my-1 p-1 border-2 border-black bg-black/5 text-center">
            <div className="text-[8.5px] font-black uppercase tracking-wider text-black">SUCURSAL DE ORIGEN:</div>
            <div className="text-[12px] font-black uppercase">{orden.sucursal_origen_nombre}</div>
          </div>
        )}

        {orden.ubicacion_ropa && (
          <div className="my-1 p-1 border border-black bg-black/5 text-center">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-black">UBICACIÓN:</div>
            <div className="text-[13px] font-bold uppercase">{orden.ubicacion_ropa}</div>
          </div>
        )}

        <div className="my-1.5 rounded-md border border-black py-1 pl-2.5 pr-3 flex items-center">
          <div className="flex-1 flex items-center justify-center gap-1.5 font-bold text-[10.5px] uppercase tracking-wide">
            {ticketBadgeData.icon}
            <span>{ticketBadgeData.label}</span>
          </div>
          <div className="h-4 w-px bg-black/40" />
          <div
            className={`px-2 flex items-center justify-center font-bold whitespace-nowrap ${ticketBadgeData.isMixto ? "text-[11.5px]" : "min-w-[4rem] text-[13.5px]"}`}
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            {ticketBadgeData.value}
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

        <div className="space-y-0.5 text-[10.5px] pr-2">
          <div className="flex items-start justify-between gap-1 py-1 border-b border-dotted border-black/40">
            <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
              <User className="h-3 w-3 text-black" />
              <span>CLIENTE:</span>
            </div>
            <span className="font-semibold text-right text-black break-words max-w-[65%]">
              {cliente.nombre} {cliente.apellido || ""}
            </span>
          </div>

          {cliente.telefono && cliente.telefono !== "---" && (
            <div className="flex items-center justify-between gap-1 py-1 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
                <Phone className="h-3 w-3 text-black" />
                <span>TELÉFONO:</span>
              </div>
              <span className="font-bold text-right text-black tabular-nums">{formatPhoneDO(cliente.telefono)}</span>
            </div>
          )}

          {(cliente.direccion || orden.direccion_entrega) && (
            <div className="flex items-start justify-between gap-1 py-1 border-b border-dotted border-black/40">
              <div className="flex items-center gap-1 font-bold uppercase shrink-0 text-black">
                <MapPin className="h-3 w-3 text-black" />
                <span>DIRECCIÓN:</span>
              </div>
              <span className="font-bold text-right text-[10px] leading-tight text-black max-w-[60%] break-words">
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
              {Array.from(new Set(orden.servicios || [])).map((sName, i) => {
                const itemsDesglosados = (orden.items || []).filter((it) => it.descripcion.startsWith("↳"));
                const misPrendas = itemsDesglosados.filter((it) =>
                  it.servicio_origen
                    ? it.servicio_origen === sName
                    : it.descripcion.toLowerCase().includes(sName.toLowerCase()) || orden.servicios?.length === 1
                );

                const srv = srvListSafe.find((s) => s.nombre === sName);
                return (
                  <div key={'prod-srv-' + i} className="mb-1">
                    <div className="font-bold text-[10.5px] text-black uppercase">
                      ★ {sName}
                      {srv?.permite_piezas_adicionales && (srv?.piezas_incluidas || 0) > 0 && (
                        <span className="font-semibold text-black/70 text-[9px] lowercase ml-1">
                          (cubre {srv.piezas_incluidas} pzs)
                        </span>
                      )}
                    </div>
                    {misPrendas.map((it, dIdx) => (
                      <div key={'prod-item-' + dIdx} className="pl-1.5 text-[10.5px]">
                        <span className="font-bold text-black">
                          • {it.cantidad} × {it.descripcion.replace(/^↳\s*/, "")}{it.es_libra ? ` (${it.cantidad} ${it.unidad_peso || "lb"}${it.cantidad_prendas ? ` · ${it.cantidad_prendas} pzs` : ""})` : it.es_metro_cuadrado ? ` (${it.largo && it.ancho ? `${it.largo}m × ${it.ancho}m = ` : ""}${it.cantidad} ${it.unidad_medida || "m²"}${it.cantidad_prendas && it.cantidad_prendas > 1 ? ` · ${it.cantidad_prendas} pzs` : ""})` : ""}
                        </span>
                        {it.cargo_adicional && it.cargo_adicional > 0 ? (
                          <div className="text-[9px] font-black text-black pl-1.5">
                            + Cargo extra: {formatRD(it.cargo_adicional, tenant)} {it.cargo_adicional_motivo ? `(${it.cargo_adicional_motivo})` : ""}
                          </div>
                        ) : null}
                        {it.color && (
                          <div className="text-[9px] font-bold text-black pl-1.5">
                            Color: {it.color}
                          </div>
                        )}
                        {it.notas && (
                          <div className="text-[9px] font-bold text-black pl-1.5">
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
                  <div key={'prod-suelto-' + i} className="text-[10.5px]">
                    <span className="font-bold text-black">
                      • {it.cantidad} × {it.descripcion}{it.es_libra ? ` (${it.cantidad} ${it.unidad_peso || "lb"}${it.cantidad_prendas ? ` · ${it.cantidad_prendas} pzs` : ""})` : it.es_metro_cuadrado ? ` (${it.largo && it.ancho ? `${it.largo}m × ${it.ancho}m = ` : ""}${it.cantidad} ${it.unidad_medida || "m²"}${it.cantidad_prendas && it.cantidad_prendas > 1 ? ` · ${it.cantidad_prendas} pzs` : ""})` : ""}
                    </span>
                    {it.cargo_adicional && it.cargo_adicional > 0 ? (
                      <div className="text-[8.5px] font-bold text-black pl-1.5">
                        + Cargo extra: {formatRD(it.cargo_adicional, tenant)} {it.cargo_adicional_motivo ? `(${it.cargo_adicional_motivo})` : ""}
                      </div>
                    ) : null}
                    {it.color && (
                      <div className="text-[8.5px] font-bold text-black pl-1.5">
                        Color: {it.color}
                      </div>
                    )}
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
            {Boolean((tenant as any).eslogan?.trim()) && (tenant as any).eslogan !== "tu lavandería, simplificada" && (
              <div className="text-[10px] text-black font-semibold italic">{(tenant as any).eslogan}</div>
            )}
          </div>
        )}
        {(cfg?.ticket_mostrar_rnc ?? true) && (tenant.rnc || (cfg as any)?.rnc_emisor) && (
          <div className="text-[10px]"><b>{tenant.documento_fiscal_label || "RNC"}:</b> <span className="font-semibold tabular-nums">{tenant.rnc || (cfg as any)?.rnc_emisor}</span></div>
        )}
        {tenant.telefono && <div className="text-[10px]"><b>Tel:</b> <span className="font-semibold tabular-nums">{tenant.pais_codigo && tenant.pais_codigo !== "DO" ? tenant.telefono : formatPhoneDO(tenant.telefono)}</span></div>}
        {tenant.direccion && <div className="text-[10px] leading-tight font-bold text-black">{tenant.direccion}</div>}
      </div>

      <Sep />

      {/* 2. ENCABEZADO PRINCIPAL DE DOCUMENTO */}
      <div className="text-center font-extrabold uppercase text-[12.5px] py-0.5 tracking-wider">
        {tipoDocumento}
      </div>
      {esCopiaCaja && (
        <div className="text-center font-extrabold uppercase text-[10px] py-0.5 bg-black text-white my-1 rounded-xs tracking-wider">
          ★ COPIA DE CAJA ★
        </div>
      )}

      <Sep />

      {/* 3. METADATOS DE LA ORDEN CON ICONOS */}
      <div className="space-y-1 text-[11px] pr-2">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 shrink-0 text-black" />
          <span className="text-[13px]"><b>Orden No°:</b> <span className="font-black tabular-nums ml-0.5">{orden.numero}</span></span>
        </div>

        {orden.nota_credito_ncf || orden.nota_debito_ncf ? (
          <>
            <div className={`flex items-center gap-1.5 font-bold ${isCreditNote ? "text-destructive" : "text-blue-700"}`}>
              <FileText className="h-4 w-4 shrink-0" />
              <span className="text-[13px]"><b>{isECF ? 'e-NCF:' : 'NCF:'}</b> <span className="font-black tabular-nums ml-0.5">{fiscalNCF}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span><b>{isECF ? 'e-NCF modificado:' : 'NCF modificado:'}</b> <span className="font-bold tabular-nums ml-0.5">{orden.ncf}</span></span>
            </div>
          </>
        ) : (
          orden.ncf && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0 text-black" />
              <span className="text-[13px]"><b>{isECF ? "e-NCF:" : "NCF:"}</b> <span className="font-black tabular-nums ml-0.5">{orden.ncf}</span></span>
            </div>
          )
        )}

        {orden.sri_clave_acceso && (
          <div className="border border-dashed border-black/40 p-1.5 my-1 rounded text-center space-y-0.5">
            <div className="text-[11px] font-black uppercase">Factura Electrónica SRI</div>
            <div className="text-[10px] font-mono"><b>Serie:</b> {orden.sri_secuencial || "001-001"}</div>
            <div className="text-[8.5px] font-mono break-all leading-none pt-0.5">
              <b>Clave de Acceso:</b><br />
              {orden.sri_clave_acceso}
            </div>
            {orden.sri_numero_autorizacion && (
              <div className="text-[8.5px] font-mono"><b>Aut:</b> {orden.sri_numero_autorizacion}</div>
            )}
            <div className="text-[8.5px] font-bold text-black uppercase">Autorizado por el SRI</div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-black" />
          <span><b>Fecha Emisión:</b> <span className="font-semibold tabular-nums ml-0.5">{formatDateTimeRD(fiscalIssueDate || orden.creado_en)}</span></span>
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
              <div className="flex items-start gap-1.5 text-[10.5px]">
                <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div>
                  <b>Teléfono:</b> <span className="font-bold tabular-nums ml-0.5 text-black">{formatPhoneDO(cliente.telefono)}</span>
                </div>
              </div>
            )}

            {cliente.direccion && (
              <div className="flex items-start gap-1.5 text-[10.5px] leading-tight">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-black" />
                <div className="break-words">
                  <b>Dirección:</b> <span className="font-bold ml-0.5 text-black">{cliente.direccion}</span>
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
          const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * ((it.precio_unitario || 0) + (it.cargo_adicional || 0))), 0) + 
                                (orden.servicios?.map(s => orden.servicios_precios?.[s] !== undefined ? orden.servicios_precios[s] : (srvListSafe.find(x => x.nombre === s)?.precio || 0)).reduce((a,b) => a+b, 0) || 0);
          
          const isItbisIncluidoEnEstaOrden = orden.itbis > 0 
                                            ? (subtotalBruto - orden.subtotal > 1) 
                                            : !!cfg?.itbis_incluido;

          const itemsSueltos = orden.items.filter(it => !it.descripcion.startsWith("↳"));
          const itemsDesglosados = orden.items.filter(it => it.descripcion.startsWith("↳"));

          return (
            <>
              {/* Servicios con caja de servicio redondeada */}
              {Array.from(new Set(orden.servicios || [])).map((sName, i) => {
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
                    {/* Caja de Servicio con Fondo Gris Suave, Altura Compacta y Tipografía Negrita */}
                    <div className="my-1.5 rounded-md border border-black bg-black/[0.08] pl-2.5 pr-4 py-1 flex items-center justify-between text-[10.5px] uppercase tracking-wide">
                      <div className="flex items-center gap-1.5 font-extrabold shrink-0 text-black">
                        <WashingMachine className="h-3.5 w-3.5" />
                        <span className="text-[9.5px] tracking-wider font-black">SERVICIO</span>
                      </div>
                      <div className="h-3.5 w-px bg-black/50 mx-2" />
                      <span className="font-black truncate text-[11px] tracking-wide text-right text-black">{sName}</span>
                    </div>

                    {/* Tabla de encabezados */}
                    <div className="flex justify-between items-center font-bold uppercase text-[9.5px] pb-1 border-b border-black text-black">
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <List className="h-3.5 w-3.5 shrink-0" />
                        <span>DESCRIPCIÓN</span>
                      </div>
                      {mostrarColumnaItbis && (
                        <div className="w-[20%] text-right flex items-center justify-end gap-0.5">
                          <BadgePercent className="h-3 w-3 shrink-0" />
                          <span>ITBIS</span>
                        </div>
                      )}
                      <div className={`${mostrarColumnaItbis ? "w-[28%]" : "w-[26%]"} text-right pr-3 flex items-center justify-end gap-0.5`}>
                        <Tag className="h-3 w-3 shrink-0" />
                        <span>VALOR</span>
                      </div>
                    </div>

                    {/* Fila del servicio si tiene precio directo */}
                    {p > 0 && (() => {
                      let srvItbis = 0;
                      let srvValor = p;
                      if (orden.itbis > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          srvItbis = p - (p / (1 + (cfg?.itbis_porcentaje || 18) / 100));
                          srvValor = mostrarColumnaItbis ? (p - srvItbis) : p;
                        } else {
                          srvItbis = p * ((cfg?.itbis_porcentaje || 18) / 100);
                        }
                      }
                      const srvUnit = isItbisIncluidoEnEstaOrden && orden.itbis > 0 && mostrarColumnaItbis ? srvValor : p;

                      return (
                        <div className="flex justify-between items-start py-1 border-b border-dotted border-black/30 font-medium">
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="font-bold text-black text-[12px]">
                              Servicio {sName}
                              {srv?.permite_piezas_adicionales && (srv?.piezas_incluidas || 0) > 0 && (
                                <span className="font-semibold text-black text-[9.5px] ml-1">
                                  (Base {srv.piezas_incluidas} {srv.piezas_incluidas === 1 ? "pza" : "pzs"})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-black font-extrabold tabular-nums">1 × {formatNumber(srvUnit)}</div>
                          </div>
                          {mostrarColumnaItbis && (
                            <div className="w-[20%] text-right font-bold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">
                              {orden.itbis > 0 ? formatNumber(srvItbis) : "0.00"}
                            </div>
                          )}
                          <div className={`${mostrarColumnaItbis ? "w-[28%]" : "w-[26%]"} text-right pr-3 font-extrabold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[12px]`}>
                            {formatNumber(srvValor)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Desgloses de prendas debajo del servicio */}
                    <div className="divide-y divide-dotted divide-black/30">
                      {misPrendasDesglosadas.map((it, dIdx) => {
                        let baseTotal = it.cantidad * ((it.precio_unitario || 0) + (it.cargo_adicional || 0));
                        let itemItbis = 0;
                        let valor = baseTotal;
                        if (orden.itbis > 0 && !it.is_exento && baseTotal > 0) {
                          if (isItbisIncluidoEnEstaOrden) {
                            itemItbis = baseTotal - (baseTotal / (1 + (cfg?.itbis_porcentaje || 18) / 100));
                            valor = mostrarColumnaItbis ? (baseTotal - itemItbis) : baseTotal;
                          } else {
                            itemItbis = baseTotal * ((cfg?.itbis_porcentaje || 18) / 100);
                          }
                        }

                        const unitPriceDisplay = isItbisIncluidoEnEstaOrden && orden.itbis > 0 && !it.is_exento && it.cantidad > 0 && mostrarColumnaItbis
                          ? (valor / it.cantidad)
                          : (it.precio_unitario || 0);

                        const cleanDesc = it.descripcion.replace(/^↳\s*/, "");
                        const hasPrice = (it.precio_unitario || 0) > 0;
                        const cantPrefix = !hasPrice && it.cantidad > 1 ? `${it.cantidad}x ` : "";

                        return (
                          <div key={'sd'+dIdx} className="flex justify-between items-start py-1">
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="font-bold text-black text-[12.5px] leading-tight break-words">
                                {cantPrefix}{cleanDesc}{it.es_libra ? ` (${it.cantidad}${it.unidad_peso || "lb"}${it.cantidad_prendas ? ` · ${it.cantidad_prendas} pzs` : ""})` : it.es_metro_cuadrado ? ` (${it.largo && it.ancho ? `${it.largo}m × ${it.ancho}m = ` : ""}${it.cantidad}${it.unidad_medida || "m²"}${it.cantidad_prendas && it.cantidad_prendas > 1 ? ` · ${it.cantidad_prendas} pzs` : ""})` : ""}
                              </div>
                              {(it.precio_unitario || 0) > 0 && (
                                <div className="text-[11px] text-black font-extrabold tabular-nums">
                                  {it.cantidad} × {formatNumber(unitPriceDisplay)}
                                </div>
                              )}
                              {it.cargo_adicional && it.cargo_adicional > 0 ? (
                                <div className="text-[9.5px] text-black font-extrabold">
                                  + Cargo extra: {formatRD(it.cargo_adicional, tenant)} {it.cargo_adicional_motivo ? `(${it.cargo_adicional_motivo})` : ""}
                                </div>
                              ) : null}
                              {it.color && <div className="text-[10px] text-black font-bold">Color: {it.color}</div>}
                              {it.notas && <div className="text-[10px] leading-tight text-black font-bold">Nota: {it.notas}</div>}
                            </div>
                            {mostrarColumnaItbis && (
                              <div className="w-[20%] text-right font-bold pt-0.5 text-black tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">
                                {baseTotal > 0 ? (itemItbis > 0 ? formatNumber(itemItbis) : "0.00") : "—"}
                              </div>
                            )}
                            <div className={`${mostrarColumnaItbis ? "w-[28%]" : "w-[26%]"} text-right pr-3 font-extrabold pt-0.5 text-black tabular-nums tracking-tight whitespace-nowrap text-[12px]`}>
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
                      <List className="h-3.5 w-3.5 shrink-0" />
                      <span>DESCRIPCIÓN</span>
                    </div>
                    {mostrarColumnaItbis && (
                      <div className="w-[20%] text-right flex items-center justify-end gap-0.5">
                        <BadgePercent className="h-3 w-3 shrink-0" />
                        <span>{tenant.impuesto_nombre || "ITBIS"}</span>
                      </div>
                    )}
                    <div className={`${mostrarColumnaItbis ? "w-[28%]" : "w-[26%]"} text-right pr-3 flex items-center justify-end gap-0.5`}>
                      <Tag className="h-3 w-3 shrink-0" />
                      <span>VALOR</span>
                    </div>
                  </div>

                  <div className="divide-y divide-dotted divide-black/30">
                    {itemsSueltos.map((it, i) => {
                      let baseTotal = it.cantidad * ((it.precio_unitario || 0) + (it.cargo_adicional || 0));
                      let itemItbis = 0;
                      let valor = baseTotal;
                      if (orden.itbis > 0 && !it.is_exento && baseTotal > 0) {
                        if (isItbisIncluidoEnEstaOrden) {
                          itemItbis = baseTotal - (baseTotal / (1 + (cfg?.itbis_porcentaje || 18) / 100));
                          valor = mostrarColumnaItbis ? (baseTotal - itemItbis) : baseTotal;
                        } else {
                          itemItbis = baseTotal * ((cfg?.itbis_porcentaje || 18) / 100);
                        }
                      }

                      const unitPriceDisplay = isItbisIncluidoEnEstaOrden && orden.itbis > 0 && !it.is_exento && it.cantidad > 0 && mostrarColumnaItbis
                        ? (valor / it.cantidad)
                        : (it.precio_unitario || 0);

                      const hasPrice = (it.precio_unitario || 0) > 0;
                      const cantPrefix = !hasPrice && it.cantidad > 1 ? `${it.cantidad}x ` : "";

                      return (
                        <div key={'suelto'+i} className="flex justify-between items-start py-1">
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="font-bold text-black leading-tight text-[12.5px] break-words">{cantPrefix}{it.descripcion}{it.es_libra ? ` (${it.cantidad}${it.unidad_peso || "lb"}${it.cantidad_prendas ? ` · ${it.cantidad_prendas} pzs` : ""})` : it.es_metro_cuadrado ? ` (${it.largo && it.ancho ? `${it.largo}m × ${it.ancho}m = ` : ""}${it.cantidad}${it.unidad_medida || "m²"}${it.cantidad_prendas && it.cantidad_prendas > 1 ? ` · ${it.cantidad_prendas} pzs` : ""})` : ""}</div>
                            {it.servicio_origen && (
                              <div className="text-[10px] font-bold text-black">↳ {it.servicio_origen}</div>
                            )}
                            {(it.precio_unitario || 0) > 0 && (
                              <div className="text-[11px] text-black font-extrabold tabular-nums">{it.cantidad} × {formatNumber(unitPriceDisplay)}</div>
                            )}
                            {it.cargo_adicional && it.cargo_adicional > 0 ? (
                              <div className="text-[9.5px] text-black font-extrabold">
                                + Cargo extra: {formatRD(it.cargo_adicional, tenant)} {it.cargo_adicional_motivo ? `(${it.cargo_adicional_motivo})` : ""}
                              </div>
                            ) : null}
                            {it.color && <div className="text-[10px] text-black font-bold">Color: {it.color}</div>}
                            {it.notas && <div className="text-[10px] leading-tight text-black font-bold">Nota: {it.notas}</div>}
                          </div>
                          {mostrarColumnaItbis && (
                            <div className="w-[20%] text-right font-bold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[10.5px]">{itemItbis > 0 ? formatNumber(itemItbis) : "0.00"}</div>
                          )}
                          <div className={`${mostrarColumnaItbis ? "w-[28%]" : "w-[26%]"} text-right pr-3 font-extrabold pt-0.5 tabular-nums tracking-tight whitespace-nowrap text-[12px]`}>{baseTotal > 0 ? formatNumber(valor) : "—"}</div>
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

      {/* 5. RECUADRO DE TOTAL DE PIEZAS / PARES */}
      <div className="my-2 rounded-md border border-black py-1 pl-2.5 pr-3 flex items-center">
        <div className="flex-1 flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-wide">
          {ticketBadgeData.icon}
          <span>{ticketBadgeData.label}</span>
        </div>
        <div className="h-4 w-px bg-black/40" />
        <div
          className={`px-2 flex items-center justify-center font-bold whitespace-nowrap ${ticketBadgeData.isMixto ? "text-[11.5px]" : "min-w-[4rem] text-[13.5px]"}`}
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          {ticketBadgeData.value}
        </div>
      </div>

      {/* 6. DESGLOSE FINANCIERO */}
      <div className="space-y-1 text-[11px] pt-1 pr-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Calculator className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>Subtotal</span>
          </div>
          <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">{formatMoney(orden.subtotal, tenant)}</span>
        </div>

        {orden.itbis > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>{tenant.impuesto_nombre || "ITBIS"} {cfg?.itbis_porcentaje ?? 18}%</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">
              {formatMoney(orden.itbis, tenant)}
            </span>
          </div>
        )}

        {orden.descuento > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Percent className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>{orden.promocion_nombre ? `Promo (${orden.promocion_nombre})` : "Descuento"}</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">-{formatMoney(orden.descuento, tenant)}</span>
          </div>
        )}

        {orden.costo_envio && orden.costo_envio > 0 && (
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold shrink-0">
              <Truck className="h-3.5 w-3.5 shrink-0 text-black" />
              <span>Envío a domicilio</span>
            </div>
            <span className="font-semibold tabular-nums tracking-tight whitespace-nowrap">{formatMoney(orden.costo_envio, tenant)}</span>
          </div>
        )}

        <div className="my-1 border-t-[1.5px] border-dashed border-black" />

        <div className="flex justify-between items-center py-0.5 gap-2">
          <div className="flex items-center gap-1.5 text-[12.5px] font-black tracking-tight shrink-0">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-black" />
            <span>TOTAL</span>
          </div>
          <span className="font-black text-[14.5px] tabular-nums tracking-tight whitespace-nowrap">{formatMoney(orden.total, tenant)}</span>
        </div>

        {orden.descuento > 0 && (
          <div className="mt-1.5 py-1 px-2 border border-dashed border-black rounded text-center text-[10.5px] font-bold leading-tight">
            ¡Te ahorraste {formatMoney(orden.descuento, tenant)} en esta orden!
          </div>
        )}
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
                <span className="font-semibold tabular-nums">{formatMoney(pd.monto, tenant)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <FileText className="h-3.5 w-3.5 shrink-0 text-black" />
            <span>{isCreditNote || isDebitNote ? "Estado de orden:" : "Estado de factura:"}</span>
          </div>
          <span className="font-black uppercase tracking-wide shrink-0">
            {isCreditNote
              ? orden.nota_credito_anula_totalmente
                ? "ANULADA"
                : "AJUSTADA POR NOTA DE CRÉDITO"
              : isDebitNote
                ? "AJUSTADA POR NOTA DE DÉBITO"
                : orden.saldo === 0
                ? "PAGADA"
                : "PENDIENTE DE PAGO"}
          </span>
        </div>

        {pagoRecibido !== undefined ? (
          <>
            {orden.saldo === 0 && (pagoRecibido < orden.total || orden.pagado > pagoRecibido) ? (
              <>
                <Row k="Saldo pendiente" v={formatMoney(0, tenant)} icon={Hourglass} bold />
                {vuelto > 0 && <Row k="Cambio" v={formatMoney(vuelto, tenant)} icon={ArrowRightLeft} boldValue />}
              </>
            ) : pagoRecibido < (orden.saldo + pagoRecibido) && pagoRecibido > 0 ? (
              <>
                <Row k="Abonado" v={formatMoney(pagoRecibido, tenant)} icon={Wallet} bold />
                <Row k="Saldo restante" v={formatMoney(orden.saldo, tenant)} icon={Hourglass} bold />
              </>
            ) : (
              <>
                <Row k="Recibido" v={formatMoney(pagoRecibido, tenant)} icon={Coins} />
                {vuelto > 0 && <Row k="Cambio" v={formatMoney(vuelto, tenant)} icon={ArrowRightLeft} boldValue />}
              </>
            )}
          </>
        ) : (
          orden.saldo > 0 && orden.pagado > 0 && (
            <>
              <Row k="Abonado" v={formatMoney(orden.pagado, tenant)} icon={Wallet} bold />
              <Row k="Saldo restante" v={formatMoney(orden.saldo, tenant)} icon={Hourglass} bold />
            </>
          )
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

        {orden.es_urgente && (
          <div className="mt-2 py-1.5 px-2 bg-black text-white text-center rounded-xs border border-black">
            <div className="text-[12px] font-black tracking-wider uppercase leading-tight text-white">
              ★ PEDIDO EXPRESS ★
            </div>
            <div className="text-[9px] font-bold text-white uppercase tracking-wide mt-0.5">
              Entrega prioritaria garantizada
            </div>
          </div>
        )}
      </div>

      {/* CONTROL DE MARBETE (Solo visible en Copia de Caja o Copia de Taller) */}
      {(esCopiaCaja || esProduccion) && ((orden.marbetes && orden.marbetes.length > 0) || orden.marbete_secuencia) && (
        <>
          <Sep />
          <div className="border border-black p-1.5 my-1 text-center bg-black/5 rounded-xs">
            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-black flex items-center justify-center gap-1">
              <span>CONTROL DE MARBETE</span>
            </div>
            {orden.marbetes && orden.marbetes.length > 0 ? (
              <div className="space-y-0.5 mt-1">
                {orden.marbetes.map((m, idx) => (
                  <div key={idx} className="text-[11px] font-bold text-black flex items-center justify-between px-1">
                    <span>[{idx + 1}] {m.color.toUpperCase()}</span>
                    <span>{m.piezas} PZAS</span>
                    <span>#{m.secuencia}</span>
                  </div>
                ))}
                {orden.marbetes.length > 1 && (
                  <div className="text-[9.5px] font-black text-black pt-1 border-t border-black/30 mt-1">
                    TOTAL PRENDAS MARBETES: {orden.marbetes.reduce((sum, it) => sum + (Number(it.piezas) || 0), 0)} PZAS
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] font-bold text-black mt-0.5">
                {orden.marbete_color ? `${orden.marbete_color.toUpperCase()} • ` : ""}
                {orden.marbete_piezas || totalPrendas} PZAS • #{orden.marbete_secuencia}
              </div>
            )}
          </div>
        </>
      )}

      <Sep />

      {/* 8. ATENDIDO POR & PIE DE PÁGINA */}
      <div className="text-center py-0.5">
        <div className="text-[11px] font-bold text-black uppercase tracking-wide">Atendido por:</div>
        <div className="text-[14px] font-black text-black mt-0.5">{empleado.nombre}</div>
      </div>

      {cfg?.ticket_pie !== undefined ? (
        cfg.ticket_pie.trim() !== "" && (
          <div className="text-center py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-black">
            {cfg.ticket_pie}
          </div>
        )
      ) : (
        <div className="text-center py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-black">
          ¡GRACIAS POR SU PREFERENCIA!
        </div>
      )}

      {cfg?.ticket_nota !== undefined ? (
        cfg.ticket_nota.trim() !== "" && (
          <>
            <Sep />
            <div className="text-center text-[9.5px] leading-snug text-black font-bold tracking-tight">
              {cfg.ticket_nota}
            </div>
          </>
        )
      ) : (
        <>
          <Sep />
          <div className="text-center text-[9.5px] leading-snug text-black font-bold tracking-tight">
            Ropa con más de 30 días será vendida por importe de trabajo.
          </div>
        </>
      )}

      {/* 9. SECCIÓN FISCAL E-CF / QR DGII */}
      {isPendingECF && (
        <div className="mt-2 text-center text-[9.5px] font-bold border-t-[1.5px] border-dashed border-black/50 pt-1.5 leading-snug">
          Documento sujeto a timbrado e-CF.
        </div>
      )}

      {orden.sri_clave_acceso && (
        <div className="mt-2 flex flex-col items-center gap-1 border-t border-black/30 pt-1.5">
          <div className="text-[9.5px] font-black uppercase text-center tracking-wide">
            Factura Electrónica SRI (Ecuador)
          </div>
          <div className="p-1 bg-white">
            <QRCodeSVG
              value={orden.sri_ride_url || `https://sri-ec.klynncloud.com/sri/comprobantes/${orden.sri_clave_acceso}/ride`}
              size={90}
              level="M"
            />
          </div>
          <div className="text-[8.5px] text-center leading-snug font-mono text-black">
            <div>Clave de Acceso SRI:</div>
            <div className="break-all font-bold px-1">{orden.sri_clave_acceso}</div>
            {tenant.config?.sri_config?.contribuyente_rimpe && (
              <div className="font-sans font-bold text-[8px] uppercase mt-0.5">Contribuyente Régimen RIMPE</div>
            )}
          </div>
        </div>
      )}

      {isRejectedECF && (
        <div className="mt-2 text-center text-[9.5px] font-black border-2 border-black p-1.5 leading-snug">
          DOCUMENTO RECHAZADO POR DGII. NO ES UN COMPROBANTE FISCAL VÁLIDO.
        </div>
      )}

      {isAcceptedECF && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="text-[9.5px] font-black uppercase text-center tracking-wide">
            {isCreditNote
              ? "Nota de Crédito Electrónica"
              : isDebitNote
                ? "Nota de Débito Electrónica"
              : orden.ncf
                ? (NCF_NOMBRES[orden.ncf.substring(0, 3)] ? `Factura de ${NCF_NOMBRES[orden.ncf.substring(0, 3)]} Electrónica` : "Factura Electrónica")
                : "Factura Electrónica"}
          </div>
          {qrData ? (
            <div className="p-1 bg-white">
              <QRCodeSVG value={qrData} size={100} level="M" />
            </div>
          ) : null}
          <div className="text-[9px] text-center leading-snug font-bold text-black">
            {fiscalSecurityCode && fiscalSecurityCode !== "null" && (
              <div>Código de Seguridad: <span className="font-black">{fiscalSecurityCode}</span></div>
            )}
            {fiscalSignatureDate && fiscalSignatureDate !== "null" && (
              <div>Fecha Firma: <span className="font-semibold">{formatDateTimeRD(fiscalSignatureDate)}</span></div>
            )}
            {ecfStatus && <div>Estado DGII: <span className="font-black">{formatEcfStatus(ecfStatus)}</span></div>}
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
function Row({
  k,
  v,
  bold,
  boldValue,
  icon: Icon
}: {
  k: string;
  v: string;
  bold?: boolean;
  boldValue?: boolean;
  icon?: any;
}) {
  return (
    <div className={`flex justify-between items-center gap-2 text-[11px] ${bold ? "font-bold" : "font-semibold"}`}>
      <div className="flex items-center gap-1.5 font-semibold shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-black" />}
        <span>{k}:</span>
      </div>
      <span className={boldValue || bold ? "font-bold tabular-nums" : "font-semibold tabular-nums"}>{v}</span>
    </div>
  );
}
