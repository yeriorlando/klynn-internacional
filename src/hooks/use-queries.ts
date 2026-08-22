import { useQuery } from "@tanstack/react-query";
import { 
  getClientes, getOrdenes, getCatalogo, getServicios, 
  getCajaAbierta, getGastos, getEmpleados, getMovimientos,
  getECFConfig, getCajas, getECFDocuments, getPlans, 
  getGlobalConfig, getECFSequences, getMetasServicios 
} from "@/lib/storage";

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
  });
}

export function useGastos(tenantId: string) {
  return useQuery({
    queryKey: ['gastos', tenantId],
    queryFn: () => getGastos(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
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
    queryKey: ['movimientos', tenantId, cajaId],
    queryFn: () => getMovimientos(tenantId, cajaId!),
    enabled: !!tenantId && tenantId !== '__loading__' && !!cajaId,
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
  });
}

export function useECFDocuments(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-documents', tenantId],
    queryFn: () => getECFDocuments(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => getPlans(),
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
    queryClient.prefetchQuery({ queryKey: ["conversations", tenantId], queryFn: () => getConversations(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["ecf-config", tenantId], queryFn: () => getECFConfig(tenantId) });
    queryClient.prefetchQuery({ queryKey: ["global-config"], queryFn: () => getGlobalConfig() });
    queryClient.prefetchQuery({ queryKey: ["plans"], queryFn: () => getPlans() });
  } catch (e) {
    console.warn("Aviso en prefetchTenantData:", e);
  }
}





