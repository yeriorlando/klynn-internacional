# Integración EF2 en Klynn

EF2 es el proveedor activo de facturación electrónica de esta aplicación. La
infraestructura, columnas, migraciones y Edge Functions históricas de
Pronesoft se conservan sin eliminarlas ni sobrescribirlas.

## Arquitectura

- El navegador llama únicamente a `ef2-proxy`.
- `ef2-proxy` autentica la sesión Supabase y valida acceso al `tenant_id`.
- El token Bearer se almacena en `ecf_provider_credentials`, tabla sin permisos
  para `anon` ni `authenticated`.
- Las emisiones usan `procesar_factura.php` y una reserva durable en
  `ecf_submission_idempotency`.
- Los rangos se administran mediante `ecf_secuencia_api.php`.
- La conciliación usa `auditoria_factura.php`.
- `ef2-reconciler` es un worker de backend: consulta los e-CF EF2 pendientes y
  actualiza `ecf_documents` y `ordenes` a `ACCEPTED` o `REJECTED`.
- EF2 asigna el e-NCF; Klynn no reserva una secuencia electrónica local antes
  de emitir.

## Despliegue requerido

1. Revisar y aplicar `supabase/migrations/20260828_ef2_provider_integration.sql`.
2. Confirmar que el proyecto ya tiene aplicada
   `20260824_offline_fiscal_idempotency.sql`.
3. Desplegar la función `ef2-proxy` con verificación JWT habilitada.
4. Confirmar los secretos internos `SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` en Supabase Edge Functions.
5. En `/admin`, asignar ambiente y activar EF2 por lavandería, o definir la
   política global.
6. En `/configuracion`, guardar y verificar el token EF2 del negocio.
7. Sincronizar o crear rangos e-NCF y ejecutar primero homologación.
8. Aplicar `supabase/migrations/20260829_ef2_reconciliation_index.sql` y
   desplegar `ef2-reconciler` con `verify_jwt = false`.
9. En el programador del backend de `api.klynn.com.do`, ejecutar cada minuto un
   `POST` a `/functions/v1/ef2-reconciler`, enviando el secreto
   `EF2_RECONCILER_CRON_SECRET` únicamente en el encabezado `x-cron-secret`.
   Ese secreto debe existir solo en el entorno de Edge Functions y el servidor
   programador; nunca en el navegador ni en `.env` del frontend.

## Certificado digital

La documentación pública de EF2 no expone un endpoint para cargar certificados
`.p12` ni su contraseña. Klynn no transmite ni modifica esos datos para EF2; el
certificado debe configurarse en la cuenta/soporte de EF2. Los campos legacy de
certificado y Pronesoft permanecen intactos en Supabase.

## Funciones no documentadas por EF2

La documentación pública consultada no incluye endpoints para:

- listar empresas asociadas;
- comprobantes recibidos;
- aprobación comercial;
- consulta del padrón RNC;
- exportaciones 606 o de facturas emitidas.

Klynn no simula esas respuestas. El panel de empresas usa la configuración de
tenants de Klynn; recibidos/aprobación permanecen locales; el RNC se valida por
formato y las exportaciones se generan desde los datos persistidos.

## Verificación previa a producción

- Ejecutar `npm run test:ef2`.
- Ejecutar `npm run build`.
- Verificar E31 y E32 en el ambiente de pruebas.
- Emitir E33/E34 solamente contra un e-NCF de prueba existente.
- Confirmar en auditoría: estado DGII, QR, PDF/XML, fecha de firma y código de
  seguridad.
- No activar `eCF` hasta guardar un token propio válido y configurar el
  certificado en EF2.

Referencias: <https://doc.ef2.do/> y <https://doc.ef2.do/swagger.yaml>.
