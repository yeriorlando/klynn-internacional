-- Migración: Asegurar permisos de ejecución para la función editar_orden
-- Permite que clientes autenticados y anónimos puedan invocar la función RPC,
-- dejando que la propia función (SECURITY DEFINER) verifique auth.uid() y los roles/permisos del empleado.

BEGIN;

GRANT EXECUTE ON FUNCTION public.editar_orden(text,text,jsonb,text,boolean) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
