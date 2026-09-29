import { useQuery } from "@tanstack/react-query";
import { 
  getClientes, getOrdenes, getCatalogo, getServicios, 
  getCajaAbierta, getGastos, getEmpleados, getMovimientos,
  getECFConfig, getCajas, getECFDocuments, getPlans, getCountryPlans,
  getGlobalConfig, getECFSequences, getMetasServicios,
  getPromociones, getSuplidores, getFacturasCXP, getAbonosCXP,
  getPeriodosNomina, getDetallesNomina, getAnticiposNomina,
  getGastoCategorias, getGastoPlantillas
} from "@/lib/storage";

export function usePromociones(tenantId: string) {
  return useQuery({
    queryKey: ['promociones', tenantId],
    queryFn: () => getPromociones(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useMetasServicios(tenantId: string) {
  return useQuery({
    queryKey: ['metas-servicios', tenantId],
    queryFn: () => getMetasServicios(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useClientes(tenantId: string) {
  return useQuery({
    queryKey: ['clientes', tenantId],
    queryFn: () => getClientes(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useOrdenes(tenantId: string) {
  return useQuery({
    queryKey: ['ordenes', tenantId],
    queryFn: () => getOrdenes(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCatalogo(tenantId: string) {
  return useQuery({
    queryKey: ['catalogo', tenantId],
    queryFn: () => getCatalogo(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useServicios(tenantId: string) {
  return useQuery({
    queryKey: ['servicios', tenantId],
    queryFn: () => getServicios(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCajaAbierta(tenantId: string) {
  return useQuery({
    queryKey: ['caja-abierta', tenantId],
    queryFn: () => getCajaAbierta(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useGastos(tenantId: string) {
  return useQuery({
    queryKey: ['gastos', tenantId],
    queryFn: () => getGastos(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useGastoCategorias(tenantId: string) {
  return useQuery({
    queryKey: ["gasto-categorias", tenantId],
    queryFn: () => getGastoCategorias(tenantId),
    enabled: !!tenantId && tenantId !== "__loading__",
  });
}

export function useGastoPlantillas(tenantId: string) {
  return useQuery({
    queryKey: ["gasto-plantillas", tenantId],
    queryFn: () => getGastoPlantillas(tenantId),
    enabled: !!tenantId && tenantId !== "__loading__",
  });
}

export function useEmpleados(tenantId: string) {
  return useQuery({
    queryKey: ['empleados', tenantId],
    queryFn: () => getEmpleados(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useMovimientos(tenantId: string, cajaId?: string) {
  return useQuery({
    queryKey: ['movimientos', tenantId, cajaId || 'all'],
    queryFn: () => getMovimientos(tenantId, cajaId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useECFConfig(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-config', tenantId],
    queryFn: () => getECFConfig(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCajas(tenantId: string) {
  return useQuery({
    queryKey: ['cajas', tenantId],
    queryFn: () => getCajas(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useECFDocuments(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-documents', tenantId],
    queryFn: () => getECFDocuments(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function usePlans(countryCode?: string) {
  return useQuery({
    queryKey: ['plans', countryCode || 'DO'],
    queryFn: () => getCountryPlans(countryCode),
  });
}

export function useGlobalConfig() {
  return useQuery({
    queryKey: ['global-config'],
    queryFn: () => getGlobalConfig(),
  });
}

export function useECFSequences(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-sequences', tenantId],
    queryFn: () => getECFSequences(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

import { supabase } from "@/lib/supabase";

export async function getConversations(tenantId: string) {
  if (!tenantId || tenantId === '__loading__') return [];
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('time', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export function useConversations(tenantId: string) {
  return useQuery({
    queryKey: ['conversations', tenantId],
    queryFn: () => getConversations(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useSuplidores(tenantId: string) {
  return useQuery({
    queryKey: ['suplidores', tenantId],
    queryFn: () => getSuplidores(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function useFacturasCXP(tenantId: string) {
  return useQuery({
    queryKey: ['facturas-cxp', tenantId],
    queryFn: () => getFacturasCXP(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function useAbonosCXP(tenantId: string, facturaId?: string) {
  return useQuery({
    queryKey: ['abonos-cxp', tenantId, facturaId],
    queryFn: () => getAbonosCXP(tenantId, facturaId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function useAnticiposNomina(tenantId: string, empleadoId?: string) {
  return useQuery({
    queryKey: ['anticipos-nomina', tenantId, empleadoId],
    queryFn: () => getAnticiposNomina(tenantId, empleadoId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function usePeriodosNomina(tenantId: string) {
  return useQuery({
    queryKey: ['periodos-nomina', tenantId],
    queryFn: () => getPeriodosNomina(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function useDetallesNomina(tenantId: string, periodoId?: string) {
  return useQuery({
    queryKey: ['detalles-nomina', tenantId, periodoId],
    queryFn: () => getDetallesNomina(tenantId, periodoId),
    enabled: !!tenantId && tenantId !== '__loading__',
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

import type { QueryClient } from "@tanstack/react-query";

/** Precarga en memoria RAM y en paralelo todas las consultas principales del tenant */
export function prefetchTenantData(queryClient: QueryClient, tenantId: string) {
  if (!tenantId || tenantId === "__loading__") return;

  // Precargar en segundo plano sin bloquear el hilo principal
  try {
    queryClient.prefetchQuery({ queryKey: ["ordenes", tenantId], queryFn: () => getOrdenes(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["clientes", tenantId], queryFn: () => getClientes(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["servicios", tenantId], queryFn: () => getServicios(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["catalogo", tenantId], queryFn: () => getCatalogo(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["caja-abierta", tenantId], queryFn: () => getCajaAbierta(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["gastos", tenantId], queryFn: () => getGastos(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["empleados", tenantId], queryFn: () => getEmpleados(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["suplidores", tenantId], queryFn: () => getSuplidores(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["facturas-cxp", tenantId], queryFn: () => getFacturasCXP(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["periodos-nomina", tenantId], queryFn: () => getPeriodosNomina(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["anticipos-nomina", tenantId], queryFn: () => getAnticiposNomina(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["conversations", tenantId], queryFn: () => getConversations(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["ecf-config", tenantId], queryFn: () => getECFConfig(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["global-config"], queryFn: () => getGlobalConfig() });
    queryClient.prefetchQuery({ queryKey: ["plans"], queryFn: () => getPlans() });
  } catch (e) {
    console.warn("Aviso en prefetchTenantData:", e);
  }
}




