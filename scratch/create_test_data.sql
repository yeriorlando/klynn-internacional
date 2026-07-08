-- Insert a test tenant
INSERT INTO public.tenants (id, nombre, email, slug, plan_id, estado)
VALUES ('99999999-9999-9999-9999-999999999999', 'Test Laundry', 'test-laundry@klynn.com', 'testlaundry', 'basico', 'Prueba');

-- Insert a test auth user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('99999999-9999-9999-9999-999999999991', 'test-laundry@klynn.com', 'some-password-hash', now(), '{"provider":"email","providers":["email"]}', '{}', false);

-- Insert a test employee
INSERT INTO public.empleados (id, tenant_id, nombre, email, rol, activo)
VALUES ('99999999-9999-9999-9999-999999999991', '99999999-9999-9999-9999-999999999999', 'Test Admin', 'test-laundry@klynn.com', 'ADMIN', true);

-- Insert a test gasto referencing the employee
INSERT INTO public.gastos (id, tenant_id, descripcion, monto, fecha, empleado_id, categoria)
VALUES ('99999999-9999-9999-9999-999999999992', '99999999-9999-9999-9999-999999999999', 'Test Gasto', 100.00, now(), '99999999-9999-9999-9999-999999999991', 'Otros');
