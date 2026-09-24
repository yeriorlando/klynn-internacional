# Edición de órdenes

Aplicar `supabase/migrations/20260924120000_order_editing.sql` completo antes de publicar la interfaz. En el SQL Editor de Supabase, usar una consulta nueva y ejecutar desde `BEGIN` hasta `COMMIT`, sin seleccionar fragmentos. Un error `42601` en `LINE 1: IF` indica que se ejecutó una parte del cuerpo PL/pgSQL fuera de su función. La migración se puede repetir sin borrar las ediciones existentes.

## Reglas

- Un NCF, metadatos de emisión o documento fiscal asociado bloquea **toda** edición, incluyendo datos operativos. La RPC vuelve a comprobarlo al guardar.
- RECIBIDA sin comprobante: cliente, prendas, cantidades, precios, servicios, descuento, urgencia y entrega. El cliente no cambia si existen pagos. No se admiten totales inferiores a lo pagado.
- EN_PROCESO y LISTA sin comprobante: únicamente fecha, notas de entrega, dirección/referencia, repartidor y ubicación. La ubicación se comprueba contra órdenes activas. Cambiar la dirección limpia las coordenadas anteriores.
- Los demás estados solo permiten consultar el historial.
- Promociones, crédito, marbetes, ajustes previos y tarifas históricas que no se pueden reconstruir bloquean los cambios financieros de esta primera versión.
- Administradores y supervisores sin una lista explícita de permisos tienen acceso. Para otros empleados debe asignarse `editar-orden` en Personal. Una lista explícita de permisos se respeta.
- La edición requiere conexión y no permite guardar una orden con operaciones locales pendientes de sincronizar.

## Integridad

La RPC autentica al empleado, comprueba la lavandería y el permiso, bloquea la fila y compara una huella de la orden y su configuración con la versión cargada. El cliente envía campos permitidos; los importes se calculan en PostgreSQL. Guardado y auditoría se confirman en la misma transacción. Se conservan número, identidad, pagos y campos fiscales. No se emiten documentos ni movimientos de caja al editar.

El historial registra cambios de esta función; no reconstruye operaciones anteriores ni sustituye el historial de cobros. La interfaz muestra las últimas 50 ediciones. Las validaciones se aplican a esta RPC; los flujos antiguos de estados, caja y logística siguen siendo operaciones independientes.

## Pruebas aisladas

Estas pruebas no usan credenciales ni se conectan a una base real. Ejecutan la migración completa en PostgreSQL mediante PGlite con un esquema mínimo de prueba.

```powershell
npm install --prefix scratch/order-edit-test-runtime --no-save --package-lock=false @electric-sql/pglite
node --test supabase/tests/order-edit.test.mjs
npm run build
```

Incluyen permisos, aislamiento entre lavanderías, auditoría inmutable y atómica, pagos concurrentes, cambios de configuración, comprobantes tradicionales/electrónicos, estados, impuestos incluidos/excluidos, prendas exentas, sobrepagos, direcciones, reparto, estantería y repetición de la migración. Debe validarse la migración en el esquema de despliegue antes de publicar; las pruebas locales no verifican las políticas y triggers propios de una base remota.
