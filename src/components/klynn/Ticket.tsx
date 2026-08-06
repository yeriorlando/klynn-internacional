import type { Orden, Tenant, Empleado, Cliente, Servicio } from "@/lib/storage";
import { formatRD, formatDateTimeRD, formatDateRD, NCF_NOMBRES } from "@/lib/storage";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  orden: Orden;
  tenant: Tenant;
  empleado: Empleado;
  cliente: Cliente;
  formato?: "57mm" | "80mm";
  pagoRecibido?: number;
  serviciosList?: Servicio[];
  ocultarUbicacion?: boolean;
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

/**
 * Ticket imprimible térmico.
 * Usa @media print para ocultar el resto de la página y solo imprimir el ticket.
 */
export function Ticket({ orden, tenant, empleado, cliente, formato = "80mm", pagoRecibido, serviciosList = [], ocultarUbicacion = false }: Props) {
  const cfg = tenant.config;
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  const vuelto = pagoRecibido && pagoRecibido > orden.total ? pagoRecibido - orden.total : 0;

  // Generar URL para el QR de la DGII (e-CF)
  const isECF = orden.ncf?.startsWith("E");
  const actualQR = orden.ecf_qr === "null" ? "" : orden.ecf_qr;
  const qrData = actualQR || (isECF ? `https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=${tenant.rnc}&encf=${orden.ncf}&montototal=${orden.total}&codigoseguridad=${encodeURIComponent(orden.ecf_security_code && orden.ecf_security_code !== "null" ? orden.ecf_security_code : '')}` : "");

  let tipoDocumento = "RECIBO";
  if (orden.nota_credito_ncf) {
    tipoDocumento = isECF ? "NOTA DE CRÉDITO ELECTRÓNICA" : "NOTA DE CRÉDITO";
  } else if (orden.ncf) {
    const prefix = orden.ncf.substring(0, 3);
    const nombreOficial = NCF_NOMBRES[prefix];
    
    if (nombreOficial) {
      if (prefix === "B02" || prefix === "E32") {
        tipoDocumento = "FACTURA PARA CONSUMIDOR FINAL";
      } else if (prefix === "B01" || prefix === "E31") {
        tipoDocumento = "FACTURA DE CRÉDITO FISCAL";
      } else {
        tipoDocumento = isECF ? `FACTURA DE ${nombreOficial} ELECTRÓNICA` : `FACTURA DE ${nombreOficial}`;
      }
    } else {
      tipoDocumento = "COMPROBANTE FISCAL";
    }
  }

  // Blindar array de servicios para evitar excepciones en tiempo de ejecución
  const srvListSafe = serviciosList || [];

  const totalPrendas = (orden.items || []).filter(it => !it.descripcion.toLowerCase().startsWith("servicio:")).reduce((acc, it) => acc + it.cantidad, 0);

  return (
    <div className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-sans text-[11px] leading-snug text-black`} style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}>
      <div className="text-center space-y-0.5">
        {tenant.logo_url && (
          <div className="flex justify-center mb-0">
            <img src={tenant.logo_url} alt="Logo" className="h-24 w-auto max-w-[220px] object-contain filter grayscale" />
          </div>
        )}
        {!tenant.logo_url && <div className="text-base font-bold uppercase leading-tight">{tenant.nombre}</div>}
        {cfg?.ncf_facturacion_activa && cfg?.ticket_mostrar_rnc && tenant.rnc && <div>RNC: {tenant.rnc}</div>}
        <div>Tel: {tenant.telefono}</div>
        {tenant.direccion && <div className="text-[10px] leading-tight">{tenant.direccion}</div>}
      </div>
      <Sep />
      <div className="text-center font-bold uppercase text-[12px] py-1">{tipoDocumento}</div>
      <div className="text-center font-bold uppercase text-[11px] py-1 border border-black my-1">
        {orden.saldo === 0 ? "★ FACTURA PAGADA ★" : `⚠️ PENDIENTE: ${formatRD(orden.saldo)}`}
      </div>
      <Sep />
      <div>
        {orden.ubicacion_ropa && pagoRecibido === undefined && !ocultarUbicacion && (
          <div className="font-black uppercase text-[13px] py-1.5 mb-2 border-y border-dashed border-black text-center bg-black/10">
            UBICACIÓN: {orden.ubicacion_ropa}
          </div>
        )}
        <div className="flex justify-between items-center">
          <div><b>ORDEN:</b> {orden.numero}</div>
        </div>
        {orden.nota_credito_ncf ? (
          <>
            <div className="text-destructive font-bold">
              <b>{isECF ? 'e-NCF' : 'NCF'}:</b> {orden.nota_credito_ncf}
            </div>
            <div><b>Doc. Modificado:</b> {orden.ncf}</div>
          </>
        ) : (
          <>
            {orden.ncf && (
              <div>
                <b>{isECF ? 'e-NCF' : 'NCF'}:</b> {orden.ncf}
                {orden.ncf_vencimiento && (
                  <div className="font-bold">Fecha Vencimiento: {formatDateRD(orden.ncf_vencimiento)}</div>
                )}
              </div>
            )}
            <div><b>Fecha Emisión:</b> {formatDateTimeRD(orden.creado_en)}</div>
          </>
        )}
      </div>
      {cliente.nombre === "Consumidor" && cliente.apellido === "Final" ? (
        <Sep />
      ) : (
        <>
          <Sep />
          <div className="text-center font-bold uppercase tracking-widest">Datos del Cliente</div>
          <Sep />
          <div>
            <div><b>Cliente:</b> {cliente.nombre} {cliente.apellido || ""}</div>
            {cliente.cedula && <div><b>{cliente.tipo === 'Empresa' ? 'RNC:' : 'Cédula:'}</b> {cliente.cedula}</div>}
            {cliente.telefono && cliente.telefono !== "---" && <div><b>Teléfono:</b> {cliente.telefono}</div>}
            {cliente.direccion && <div><b>Dirección:</b> {cliente.direccion}</div>}
            {orden.notas && (
              <div className="mt-1 border-t border-dashed border-black/20 pt-1 italic">
                <b>Nota:</b> {orden.notas}
              </div>
            )}
          </div>
          <Sep />
        </>
      )}
      <div className="flex justify-between font-bold uppercase text-[10px] mb-1">
        <div className="w-[44%] DESCRIPCION">DESCRIPCION</div>
        <div className="w-[26%] text-right">ITBIS</div>
        <div className="w-[30%] text-right">VALOR</div>
      </div>
      <Sep />
      <div className="mt-1 mb-2">
        {(() => {
           const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0) + 
                                 (orden.servicios?.map(s => orden.servicios_precios?.[s] !== undefined ? orden.servicios_precios[s] : (srvListSafe.find(x => x.nombre === s)?.precio || 0)).reduce((a,b) => a+b, 0) || 0);
           
           // Si el subtotal de la orden es significativamente menor al subtotal bruto de los items, 
           // significa que cuando se creó la orden, los precios INCLUÍAN el ITBIS (y se extrajo el subtotal base).
           const isItbisIncluidoEnEstaOrden = cfg?.ncf_facturacion_activa && orden.itbis > 0 
                                              ? (subtotalBruto - orden.subtotal > 1) 
                                              : !!cfg?.itbis_incluido;

           const itemsSueltos = orden.items.filter(it => !it.descripcion.startsWith("↳"));
           const itemsDesglosados = orden.items.filter(it => it.descripcion.startsWith("↳"));

           return (
             <>
               {/* 1. Renderizar Servicios Principales y sus desgloses correspondientes */}
               {orden.servicios?.map((sName, i) => {
                  const srv = srvListSafe.find(s => s.nombre === sName);
                  const p = orden.servicios_precios?.[sName] !== undefined ? orden.servicios_precios[sName] : (srv ? srv.precio : 0);
                  let baseTotal = p;
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

                  // Encontrar prendas desglosadas que corresponden a este servicio
                  const misPrendasDesglosadas = itemsDesglosados.filter(it => 
                    it.servicio_origen 
                      ? it.servicio_origen === sName 
                      : (it.descripcion.toLowerCase().includes(sName.toLowerCase()) || 
                         (it.notas && it.notas.toLowerCase().includes(sName.toLowerCase())) ||
                         (orden.servicios.length === 1))
                  );

                  return (
                    <div key={'s'+i} className="mb-2">
                      <div className="flex justify-between items-start mb-1">
                        <div className="w-[44%] pr-1">
                          <div className="font-bold leading-tight uppercase text-[11px]">Servicio: {sName}</div>
                          <div className="text-[10px] text-black font-semibold leading-tight">1 × {formatRD(p).replace("RD$", "")}</div>
                        </div>
                        <div className="w-[26%] text-right font-bold pt-0.5">{itemItbis > 0 ? formatRD(itemItbis).replace("RD$", "") : "0.00"}</div>
                        <div className="w-[30%] text-right font-bold pt-0.5">{formatRD(valor).replace("RD$", "")}</div>
                      </div>

                      {/* Desgloses anidados debajo del servicio */}
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

                        return (
                          <div key={'sd'+dIdx} className="flex justify-between items-start pl-3 mb-1 animate-in fade-in duration-200">
                            <div className="w-[44%] pr-1">
                              <div className="font-normal text-black text-[10px] leading-tight">{it.descripcion}{it.es_libra ? ` (${it.cantidad}lb)` : (it.cantidad > 1 ? ` (x${it.cantidad})` : "")}</div>
                              {it.notas && <div className="text-[9px] italic leading-tight text-black">Nota: {it.notas}</div>}
                            </div>
                            <div className="w-[26%] text-right font-medium pt-0.5 text-black">
                              {baseTotal > 0 ? (itemItbis > 0 ? formatRD(itemItbis).replace("RD$", "") : "0.00") : "—"}
                            </div>
                            <div className="w-[30%] text-right font-medium pt-0.5 text-black">
                              {baseTotal > 0 ? formatRD(valor).replace("RD$", "") : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
               })}

               {/* 2. Renderizar prendas sueltas (no desglosadas) */}
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
                    <div key={'suelto'+i} className="flex justify-between items-start mb-1.5">
                      <div className="w-[44%] pr-1">
                        <div className="font-semibold leading-tight text-[11px]">{it.descripcion}{it.es_libra ? ` (${it.cantidad}lb)` : ""}</div>
                        <div className="text-[10px] text-black font-semibold leading-tight">{it.cantidad} × {formatRD(it.precio_unitario).replace("RD$", "")}</div>
                        {it.notas && <div className="text-[9px] italic leading-tight text-black font-sans">Nota: {it.notas}</div>}
                      </div>
                      <div className="w-[26%] text-right font-semibold pt-0.5">{itemItbis > 0 ? formatRD(itemItbis).replace("RD$", "") : "0.00"}</div>
                      <div className="w-[30%] text-right font-semibold pt-0.5">{formatRD(valor).replace("RD$", "")}</div>
                    </div>
                  );
               })}
             </>
           );
        })()}
      </div>
      <Sep />
      <div>
        <div className="text-center font-bold text-[12px] my-1">
          TOTAL DE PRENDAS: {totalPrendas}
        </div>
        <Row k="Subtotal" v={formatRD(orden.subtotal).replace("DOP", "RD$")} />
        {cfg?.ncf_facturacion_activa && orden.itbis > 0 && (
          <Row k={`ITBIS ${cfg?.itbis_porcentaje ?? 18}%`} v={formatRD(orden.itbis).replace("DOP", "RD$")} />
        )}
        {orden.descuento > 0 && <Row k="Descuento" v={`-${formatRD(orden.descuento).replace("DOP", "RD$")}`} />}
        {orden.costo_envio && orden.costo_envio > 0 && (
          <Row k="🚚 Envío a domicilio" v={formatRD(orden.costo_envio).replace("DOP", "RD$")} />
        )}
        <div className="my-1 border-t border-dashed border-black" />
        <Row k="TOTAL" v={formatRD(orden.total).replace("DOP", "RD$")} bold />
      </div>
      <Sep />
      <div>
        <Row k="Método de pago" v={orden.metodo_pago === "PAGO_AL_RETIRAR" ? "AL RETIRAR" : orden.metodo_pago === "CREDITO" ? "CRÉDITO" : orden.metodo_pago} />
        <Row k="Estado de factura" v={orden.saldo === 0 ? "PAGADA" : "PENDIENTE DE PAGO"} boldValue />
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
        {pagoRecibido === undefined && orden.saldo > 0 && (
          <Row k="Saldo pendiente" v={formatRD(orden.saldo).replace("DOP", "RD$")} bold />
        )}
        {pagoRecibido === undefined && orden.saldo === 0 && (orden.metodo_pago === "CREDITO" || orden.metodo_pago === "PAGO_AL_RETIRAR" || orden.metodo_pago === "MIXTO") && (
          <Row k="Saldo pendiente" v="RD$0.00" bold />
        )}
        {orden.pago_referencia && (
          <Row k="Referencia" v={orden.pago_referencia} />
        )}
      </div>
      <Sep />
      <div>
        <Row 
          k="Fecha de entrega" 
          v={orden.es_urgente 
            ? `${humanizeDate(orden.fecha_entrega, true)} (${cfg?.tiempo_entrega_urgente || 3} HORAS)` 
            : humanizeDate(orden.fecha_entrega, false)
          } 
          boldValue
        />
        <Row k="Estado de la orden" v={orden.estado.replace("_", " ")} />
        {orden.motivo_anulacion && (
          <div className="text-[9px] mt-1 italic leading-tight">
            <b>Motivo ({orden.motivo_anulacion_codigo || "01"}):</b> {orden.motivo_anulacion}
          </div>
        )}
        {orden.es_urgente && <div className="font-bold text-center mt-1">★ URGENTE ★</div>}
      </div>
      {cfg?.ticket_mostrar_empleado && (
        <>
          <Sep />
          <div>Atendido por: <b>{empleado.nombre}</b></div>
        </>
      )}
      <Sep />
      <div className="text-center py-1">
        <div>{cfg?.ticket_pie ?? "¡Gracias por su preferencia!"}</div>
        {cfg?.ticket_nota && (
          <div className="text-[10px] leading-tight whitespace-pre-line border-t border-dashed border-black/30 pt-1 mt-1 font-medium">
            {cfg.ticket_nota}
          </div>
        )}
      </div>
      <Sep />

      {isECF && qrData && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="text-[9px] font-bold uppercase text-center">
            {orden.ncf ? (NCF_NOMBRES[orden.ncf.substring(0, 3)] ? `Factura de ${NCF_NOMBRES[orden.ncf.substring(0, 3)]} Electrónica` : "Factura Electrónica") : ""}
          </div>
          <div className="p-1 bg-white">
            <QRCodeSVG value={qrData} size={100} level="M" />
          </div>
          <div className="text-[8px] text-center leading-tight">
            {orden.ecf_security_code && orden.ecf_security_code !== "null" && (
              <div>Código de Seguridad: {orden.ecf_security_code}</div>
            )}
            {orden.ecf_signature_date && orden.ecf_signature_date !== "null" && (
              <div>Fecha Firma: {formatDateTimeRD(orden.ecf_signature_date)}</div>
            )}
          </div>
          <div className="text-[8px] text-center leading-tight mt-1">
            Consulte su factura en:<br/>
            dgii.gov.do
          </div>
        </div>
      )}
    </div>
  );
}

function Sep() { return <div className="my-1.5 border-t border-dashed border-black" />; }
function Row({ k, v, bold, boldValue }: { k: string; v: string; bold?: boolean; boldValue?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-[12px]" : ""}`}>
      <span>{k}:</span>
      <span className={boldValue ? "font-bold" : ""}>{v}</span>
    </div>
  );
}
