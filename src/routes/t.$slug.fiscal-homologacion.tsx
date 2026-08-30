import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CheckCircle2, XCircle, AlertCircle, Loader2, FileText,
  ArrowLeft, ShieldCheck, Zap
} from "lucide-react";
import { getECFConfig, type ECFConfig, type Tenant } from "@/lib/storage";
import { getEF2Client, EF2_DEFAULT_TEST_EMPRESA, EF2_DEFAULT_TEST_RNC } from "@/lib/fiscal";

export const Route = createFileRoute("/t/$slug/fiscal-homologacion")({ component: HomologacionPage });

interface CasoPrueba {
  id: string;
  nombre: string;
  descripcion: string;
  tipo_ecf: string;
  status: 'pending' | 'success' | 'error' | 'running';
  trackId?: string;
  pdfUrl?: string;
  error?: string;
}

const CASOS_INICIALES: CasoPrueba[] = [
  { id: '1', nombre: 'E31 - Crédito Fiscal Estándar', descripcion: 'Emisión exitosa de factura de crédito fiscal.', tipo_ecf: 'E31', status: 'pending' },
  { id: '2', nombre: 'E32 - Consumo Estándar', descripcion: 'Emisión exitosa de factura de consumo final.', tipo_ecf: 'E32', status: 'pending' },
  { id: '3', nombre: 'E34 - Nota de Crédito (E31)', descripcion: 'Anulación de una factura E31 emitida anteriormente.', tipo_ecf: 'E34', status: 'pending' },
  { id: '4', nombre: 'E33 - Nota de Débito (E31)', descripcion: 'Aumento de valor de una factura E31 emitida anteriormente.', tipo_ecf: 'E33', status: 'pending' },
  { id: '5', nombre: 'E32 - Con Descuento', descripcion: 'Factura de consumo con descuento aplicado.', tipo_ecf: 'E32', status: 'pending' },
  { id: '6', nombre: 'E31 - Con ITBIS 0%', descripcion: 'Factura de crédito fiscal con productos exentos (Tasa 0).', tipo_ecf: 'E31', status: 'pending' },
  { id: '7', nombre: 'E43 - Gastos Menores', descripcion: 'Comprobante para gastos de caja chica o informales.', tipo_ecf: 'E43', status: 'pending' },
  { id: '8', nombre: 'E45 - Gubernamental', descripcion: 'Factura para venta a instituciones del Estado.', tipo_ecf: 'E45', status: 'pending' },
];

function fechaEF2(date = new Date()) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function HomologacionPage() {
  const auth = useRequireAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<ECFConfig | null>(null);
  const [casos, setCasos] = useState<CasoPrueba[]>(CASOS_INICIALES);

  useEffect(() => {
    if (auth?.tenant && auth.tenant.id !== '__loading__') {
      setTenant(auth.tenant);
      getECFConfig(auth.tenant.id).then(setConfig);
    }
  }, [auth]);

  async function ejecutarCaso(casoId: string) {
    if (!config || !tenant) return;
    
    setCasos(prev => prev.map(c => c.id === casoId ? { ...c, status: 'running', error: undefined } : c));
    
    try {
      const caso = casos.find(c => c.id === casoId)!;
      const client = getEF2Client({ tenantId: tenant.id, environment: config.ef2_environment });
      const invoiceType = caso.tipo_ecf.replace('E', '');
      const esExento = caso.id === '6' || caso.id === '7' || invoiceType === '33';
      const itbis = esExento ? 0 : 180;
      const total = 1000 + itbis;
      const baseCase = casos.find(c => c.id === '1');
      if ((invoiceType === '33' || invoiceType === '34') && !baseCase?.trackId) {
        throw new Error('Ejecuta primero el caso E31; EF2 exige el e-NCF original para notas de débito y crédito.');
      }

      const encabezado: any = {
        Version: '1.0',
        IdDoc: {
          TipoeCF: invoiceType,
          TipoIngresos: '01',
          TipoPago: '1',
          ...(invoiceType === '32' ? { FechaLimitePago: fechaEF2() } : {}),
          ...(invoiceType === '34' ? { IndicadorNotaCredito: '0' } : {}),
        },
        Emisor: {
          RNCEmisor: tenant.rnc?.replace(/\D/g, '') || EF2_DEFAULT_TEST_RNC,
          RazonSocialEmisor: tenant.nombre || EF2_DEFAULT_TEST_EMPRESA,
          NombreComercial: tenant.nombre || EF2_DEFAULT_TEST_EMPRESA,
          DireccionEmisor: tenant.direccion || 'Santo Domingo, República Dominicana',
          Municipio: '010100',
          Provincia: '010000',
          FechaEmision: fechaEF2(),
        },
        Totales: esExento
          ? { MontoExento: total.toFixed(2), MontoTotal: total.toFixed(2) }
          : {
              MontoGravadoTotal: '1000.00', MontoGravadoI1: '1000.00', ITBIS1: '18',
              TotalITBIS: itbis.toFixed(2), TotalITBIS1: itbis.toFixed(2), MontoTotal: total.toFixed(2),
            },
      };
      if (['31', '33', '34', '45'].includes(invoiceType)) {
        encabezado.Comprador = {
          RNCComprador: '101234567',
          RazonSocialComprador: 'Cliente Prueba Homologación SRL',
        };
      }
      if (invoiceType === '33' || invoiceType === '34') {
        encabezado.InformacionReferencia = {
          NCFModificado: baseCase!.trackId,
          FechaNCFModificado: fechaEF2(),
          CodigoModificacion: invoiceType === '34' ? '1' : '3',
          RazonModificacion: caso.descripcion,
        };
      }

      const response = await client.procesarFactura({
        _klynnOrderId: `homologacion:${tenant.id}:${casoId}:${Date.now()}`,
        ECF: {
          Encabezado: encabezado,
          DetallesItems: { Item: [{
            NumeroLinea: '1', IndicadorFacturacion: esExento ? '4' : '1',
            NombreItem: `Prueba EF2 ${caso.tipo_ecf}`, IndicadorBienoServicio: '2',
            CantidadItem: '1', UnidadMedida: '43', PrecioUnitarioItem: '1000.00', MontoItem: '1000.00',
          }] },
        },
      });
      if (!response.success || !response.ncf) throw new Error(response.message || response.error || 'EF2 no devolvió un e-NCF.');
      
      setCasos(prev => prev.map(c => c.id === casoId ? { 
        ...c, 
        status:  'success', 
        trackId: response.ncf,
        pdfUrl: response.pdf_cloud_url,
      } : c));
      
      toast.success(`Caso ${caso.id} completado — e-NCF: ${response.ncf}`);
    } catch (err: any) {
      setCasos(prev => prev.map(c => c.id === casoId ? { 
        ...c, 
        status: 'error', 
        error:  err.message 
      } : c));
      toast.error(`Error en caso ${casoId}: ` + err.message);
    }
  }


  if (!auth || !tenant) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/t/$slug/configuracion" params={{ slug: tenant.slug }}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader 
          title="Homologación DGII" 
          description="Ejecuta los casos de prueba obligatorios para obtener tu certificación e-CF." 
        />
      </div>

      {!config?.is_active && (
        <Card className="p-12 text-center border-dashed border-primary/30 bg-primary/5 mb-8 rounded-[2rem]">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display mb-2">Configuración Requerida</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Debes guardar un token EF2 válido y activar el modo e-CF antes de iniciar las pruebas. El certificado se administra en tu cuenta EF2.
          </p>
          <Button asChild>
            <Link to="/t/$slug/configuracion" params={{ slug: tenant.slug }}>Ir a Configuración</Link>
          </Button>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Resumen de Progreso */}
        <Card className="p-6 rounded-3xl border-none shadow-card bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Estado de Certificación</div>
              <div className="text-3xl font-display flex items-center gap-3">
                {Math.round((casos.filter(c => c.status === 'success').length / casos.length) * 100)}% 
                <span className="text-sm font-normal text-slate-400">Completado</span>
              </div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${(casos.filter(c => c.status === 'success').length / casos.length) * 100}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-blue-200 bg-blue-50 text-sm text-blue-900">
          Estas pruebas envían documentos reales al ambiente asignado a tu token EF2. EF2 no publica un ambiente distinto en la URL: la cuenta y el token determinan el proceso de homologación.
        </Card>

        {/* Lista de Casos */}
        <div className="grid gap-3">
          {casos.map((caso) => (
            <Card key={caso.id} className="p-4 rounded-2xl border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                  caso.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  caso.status === 'error' ? 'bg-red-100 text-red-600' :
                  caso.status === 'running' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {caso.status === 'success' ? <CheckCircle2 className="h-6 w-6" /> :
                   caso.status === 'error' ? <XCircle className="h-6 w-6" /> :
                   caso.status === 'running' ? <Loader2 className="h-6 w-6 animate-spin" /> :
                   <FileText className="h-6 w-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate">{caso.nombre}</h4>
                    <Badge variant="outline" className="text-[9px] h-4">{caso.tipo_ecf}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{caso.descripcion}</p>
                </div>

                <div className="flex items-center gap-3">
                  {caso.trackId && (
                    <div className="hidden md:block text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">TrackID</div>
                      <div className="text-[10px] font-mono text-emerald-600">{caso.trackId}</div>
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    variant={caso.status === 'success' ? 'ghost' : 'default'}
                    onClick={() => ejecutarCaso(caso.id)}
                    disabled={caso.status === 'running' || !config?.is_active}
                    className="rounded-xl h-9 px-4 font-bold"
                  >
                    {caso.status === 'success' ? 'Re-ejecutar' : 'Ejecutar'}
                    <Zap className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>

              {caso.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-[10px] text-red-600 font-mono">
                  Error: {caso.error}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
