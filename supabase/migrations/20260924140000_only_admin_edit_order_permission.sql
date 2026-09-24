-- Migración: Restringir la edición de órdenes a ADMINISTRADOR por defecto,
-- permitiendo que el Administrador otorgue el permiso 'editar-orden' a otros empleados desde /personal.

BEGIN;

CREATE OR REPLACE FUNCTION public.editar_orden(
  p_id text, p_expected text DEFAULT NULL, p_patch jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL, p_preview boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original public.ordenes%ROWTYPE; candidate public.ordenes%ROWTYPE;
  actor public.empleados%ROWTYPE;
  before_data jsonb; after_data jsonb; cfg jsonb; totals jsonb; changes jsonb;
  token text; financial_reason text; blocked_reason text; financial boolean; editable boolean;
  history jsonb; k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para editar órdenes.'; END IF;
  SELECT * INTO original FROM public.ordenes WHERE id::text = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no disponible.'; END IF;
  SELECT e.* INTO actor FROM public.empleados e
    WHERE e.tenant_id::text = original.tenant_id::text AND e.activo = true
      AND (e.id::text = auth.uid()::text OR lower(e.email) =
        (SELECT lower(email) FROM auth.users WHERE id = auth.uid()))
    ORDER BY (e.id::text = auth.uid()::text) DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No tienes acceso a esta orden.'; END IF;

  -- RESTRICCIÓN DE SEGURIDAD:
  -- Solo el Administrador (rol ADMIN) o colaboradores con el permiso específico 'editar-orden' pueden editar
  IF NOT coalesce((actor.rol = 'ADMIN' OR
    (actor.permisos IS NOT NULL AND (actor.permisos @> ARRAY['editar-orden']::text[] OR coalesce(to_jsonb(actor.permisos) ? 'editar-orden', false)))), false) THEN
    RAISE EXCEPTION 'No tienes permiso para editar órdenes. Solo el Administrador o personal autorizado pueden realizar esta acción.';
  END IF;

  before_data := to_jsonb(original);
  editable := coalesce(original.estado IN ('RECIBIDA','EN_PROCESO','LISTA'),false);
  IF NOT editable THEN blocked_reason := 'Solo se editan órdenes recibidas, en proceso o listas.'; END IF;
  SELECT coalesce(config,'{}'::jsonb) INTO cfg FROM public.tenants WHERE id::text = original.tenant_id::text;
  token := md5(before_data::text || coalesce(cfg,'{}'::jsonb)::text);
  IF coalesce(original.ncf,'') <> '' OR coalesce(before_data->>'ecf_id','') <> '' OR coalesce(before_data->>'ecf_status','') <> ''
    OR coalesce(before_data->>'nota_credito_ncf','') <> '' OR coalesce(before_data->>'nota_debito_ncf','') <> ''
    OR EXISTS (SELECT 1 FROM public.ecf_documents WHERE order_id::text=p_id AND tenant_id::text=original.tenant_id::text) THEN
    blocked_reason := 'Esta orden tiene un comprobante fiscal o una emisión iniciada. No admite edición; utiliza las acciones de ajuste fiscal.';
    financial_reason := blocked_reason;
    editable := false;
  ELSIF original.estado <> 'RECIBIDA' THEN financial_reason := 'En proceso o lista: solo se permiten cambios de entrega. Las prendas, el cliente y los importes están protegidos.';
  ELSIF coalesce(before_data->>'nota_credito_ncf','') <> '' OR coalesce(before_data->>'nota_debito_ncf','') <> ''
    OR coalesce((before_data->>'nota_credito_monto')::numeric,0) <> 0 OR coalesce((before_data->>'nota_debito_monto')::numeric,0) <> 0
    OR abs(original.saldo-greatest(0,original.total-original.pagado)) > 0.01 THEN
    financial_reason := 'La orden tiene ajustes previos. Conserva sus importes y usa las acciones de ajuste.';
  ELSIF coalesce(before_data->>'promocion_id','') <> '' THEN
    financial_reason := 'La orden tiene una promoción aplicada. Esta versión permite editar sus datos operativos.';
  ELSIF original.metodo_pago = 'CREDITO' THEN
    financial_reason := 'La orden está a crédito. Los cambios de importe requieren revisar el crédito del cliente.';
  ELSIF coalesce(before_data->'marbetes','[]') NOT IN ('[]'::jsonb,'null'::jsonb) OR coalesce((before_data->>'marbete_piezas')::numeric,0)>0 THEN
    financial_reason := 'La orden tiene marbetes asignados. Conserva sus prendas e importes para mantener la trazabilidad.';
  ELSIF original.itbis=0 AND coalesce((cfg->>'itbis_porcentaje')::numeric,0)>0
    AND (coalesce((cfg->>'ncf_facturacion_activa')::boolean,false) OR coalesce(cfg->>'modo_facturacion','') IN ('tradicional','electronica')) THEN
    financial_reason := 'No se puede determinar la condición de ITBIS original. Solo se permiten cambios operativos.';
  ELSE
    BEGIN
      totals := public.order_edit_totals(before_data,cfg);
      IF abs((totals->>'subtotal')::numeric-original.subtotal)>0.01 OR abs((totals->>'itbis')::numeric-original.itbis)>0.01
        OR abs((totals->>'total')::numeric-original.total)>0.01 THEN
        financial_reason := 'La tarifa histórica no coincide con la configuración actual. Solo se permiten cambios operativos.';
      END IF;
    EXCEPTION WHEN invalid_text_representation OR raise_exception THEN
      financial_reason := 'Los datos históricos no permiten recalcular esta orden. Solo se permiten cambios operativos.';
    END;
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.creado_en DESC),'[]') INTO history FROM
    (SELECT empleado_nombre,motivo,cambios,creado_en FROM public.orden_ediciones
      WHERE orden_id=p_id AND tenant_id=original.tenant_id::text ORDER BY creado_en DESC LIMIT 50) h;
  IF p_patch IS NULL THEN
    RETURN jsonb_build_object('orden',before_data,'token',token,'editable',editable,
      'financial_reason',financial_reason,'blocked_reason',blocked_reason,'historial',history);
  END IF;
  IF NOT editable THEN RAISE EXCEPTION '%', blocked_reason; END IF;
  IF p_expected IS DISTINCT FROM token THEN
    RAISE EXCEPTION 'La orden cambió mientras la editabas. Recarga la orden y revisa los cambios.' USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Cambios inválidos.'; END IF;
  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF k NOT IN ('fecha_entrega','notas','direccion_entrega','referencia_entrega','repartidor_id','ubicacion_ropa','items','cliente_id','descuento','costo_envio','es_urgente','servicios','servicios_precios') THEN
      RAISE EXCEPTION 'Campo no editable: %', k;
    END IF;
    IF p_patch->k = 'null'::jsonb THEN RAISE EXCEPTION 'El campo % no puede quedar vacío.', k; END IF;
  END LOOP;
  after_data := before_data || p_patch;
  IF p_patch ? 'repartidor_id' THEN
    IF NOT coalesce(original.entrega_domicilio,false) THEN RAISE EXCEPTION 'La orden no tiene entrega a domicilio.'; END IF;
    IF coalesce(after_data->>'repartidor_id','') = '' THEN
      after_data := after_data || jsonb_build_object('repartidor_id',NULL);
    ELSIF NOT EXISTS (SELECT 1 FROM public.empleados e WHERE e.id::text=after_data->>'repartidor_id'
      AND e.tenant_id::text=original.tenant_id::text AND e.activo=true AND e.rol='REPARTIDOR') THEN
      RAISE EXCEPTION 'Selecciona un repartidor activo de esta lavandería.';
    END IF;
  END IF;
  IF p_patch ? 'ubicacion_ropa' THEN
    IF length(after_data->>'ubicacion_ropa')>100 THEN RAISE EXCEPTION 'La ubicación no puede superar 100 caracteres.'; END IF;
    after_data := after_data || jsonb_build_object('ubicacion_ropa',NULLIF(btrim(coalesce(after_data->>'ubicacion_ropa','')),''));
    IF after_data->>'ubicacion_ropa' <> '' THEN
      PERFORM pg_advisory_xact_lock(hashtext(original.tenant_id::text),hashtext(lower(after_data->>'ubicacion_ropa')));
      IF EXISTS (SELECT 1 FROM public.ordenes o WHERE o.tenant_id=original.tenant_id AND o.id<>original.id
        AND o.estado NOT IN ('ENTREGADA','ANULADA') AND lower(btrim(o.ubicacion_ropa))=lower(after_data->>'ubicacion_ropa')) THEN
        RAISE EXCEPTION 'Esta ubicación ya está ocupada por otra orden.';
      END IF;
    END IF;
  END IF;
  IF p_patch ? 'direccion_entrega' AND before_data->>'direccion_entrega' IS DISTINCT FROM after_data->>'direccion_entrega' THEN
    after_data := after_data || jsonb_build_object('lat_entrega',NULL,'lng_entrega',NULL);
  END IF;
  financial := EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) key WHERE key IN
    ('items','cliente_id','descuento','costo_envio','es_urgente','servicios','servicios_precios') AND before_data->key IS DISTINCT FROM after_data->key);
  IF financial AND financial_reason IS NOT NULL THEN RAISE EXCEPTION '%', financial_reason; END IF;
  IF (p_patch ? 'direccion_entrega' OR p_patch ? 'referencia_entrega') AND original.estado='EN_CAMINO' THEN
    RAISE EXCEPTION 'La orden está en camino. Coordina el cambio de dirección desde Logística.';
  END IF;
  IF p_patch ? 'direccion_entrega' AND NOT coalesce(original.entrega_domicilio,false) THEN RAISE EXCEPTION 'La orden no tiene entrega a domicilio.'; END IF;
  IF length(coalesce(after_data->>'notas',''))>4000 OR length(coalesce(after_data->>'direccion_entrega',''))>500
    OR length(coalesce(after_data->>'referencia_entrega',''))>500 THEN RAISE EXCEPTION 'El texto supera el límite permitido.'; END IF;
  IF p_patch ? 'fecha_entrega' AND (after_data->>'fecha_entrega')::timestamptz < original.creado_en::timestamptz THEN
    RAISE EXCEPTION 'La fecha de entrega no puede ser anterior a la creación de la orden.';
  END IF;
  IF financial THEN
    IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id::text=after_data->>'cliente_id' AND tenant_id::text=original.tenant_id::text) THEN
      RAISE EXCEPTION 'Selecciona un cliente de esta lavandería.';
    END IF;
    IF original.pagado>0 AND after_data->>'cliente_id' IS DISTINCT FROM before_data->>'cliente_id' THEN
      RAISE EXCEPTION 'No se puede cambiar el cliente de una orden con pagos registrados.';
    END IF;
    IF (after_data->>'descuento')::numeric < 0 OR (after_data->>'descuento')::numeric > 10000000
      OR (after_data->>'costo_envio')::numeric < 0 OR (after_data->>'costo_envio')::numeric > 10000000
      OR (after_data->>'descuento') IN ('NaN','Infinity','-Infinity') OR (after_data->>'costo_envio') IN ('NaN','Infinity','-Infinity') THEN
      RAISE EXCEPTION 'Revisa el descuento y el costo de envío.';
    END IF;
    IF NOT coalesce(original.entrega_domicilio,false) AND coalesce((after_data->>'costo_envio')::numeric,0)<>0 THEN
      RAISE EXCEPTION 'La orden no tiene entrega a domicilio.';
    END IF;
    IF jsonb_typeof(after_data->'servicios') IS DISTINCT FROM 'array' OR jsonb_typeof(after_data->'servicios_precios') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Los servicios no son válidos.';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(after_data->'servicios_precios') key WHERE NOT (after_data->'servicios' ? key))
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(after_data->'servicios') s WHERE NOT (after_data->'servicios_precios' ? s)) THEN
      RAISE EXCEPTION 'Cada servicio debe tener su precio correspondiente.';
    END IF;
    IF jsonb_array_length(after_data->'items')=0 AND jsonb_array_length(after_data->'servicios')=0 THEN RAISE EXCEPTION 'La orden debe conservar al menos una prenda o servicio.'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(after_data->'items') item
      WHERE coalesce(item->>'servicio_origen','')<>'' AND NOT (after_data->'servicios' ? (item->>'servicio_origen'))) THEN
      RAISE EXCEPTION 'Hay prendas vinculadas a un servicio eliminado. Conserva ese servicio o retira sus prendas.';
    END IF;
    totals := public.order_edit_totals(after_data,cfg);
    IF (after_data->>'descuento')::numeric > (totals->>'subtotal')::numeric+(totals->>'itbis')::numeric THEN RAISE EXCEPTION 'El descuento supera el importe de la orden.'; END IF;
    IF (totals->>'total')::numeric < original.pagado THEN RAISE EXCEPTION 'El nuevo total es menor que lo pagado. Resuelve primero la diferencia mediante un ajuste.'; END IF;
    after_data := after_data || totals || jsonb_build_object('saldo',round((totals->>'total')::numeric-original.pagado,2));
  END IF;
  SELECT coalesce(jsonb_object_agg(key,jsonb_build_object('antes',before_data->key,'despues',value)),'{}') INTO changes
    FROM jsonb_each(after_data) WHERE before_data->key IS DISTINCT FROM value;
  IF changes='{}'::jsonb THEN RAISE EXCEPTION 'No hay cambios para guardar.'; END IF;
  IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Indica un motivo de entre 5 y 500 caracteres.'; END IF;
  IF p_preview THEN RETURN jsonb_build_object('orden',after_data,'cambios',changes); END IF;
  candidate := jsonb_populate_record(NULL::public.ordenes,after_data);
  UPDATE public.ordenes SET fecha_entrega=candidate.fecha_entrega, notas=candidate.notas,
    direccion_entrega=candidate.direccion_entrega, referencia_entrega=candidate.referencia_entrega,
    lat_entrega=candidate.lat_entrega, lng_entrega=candidate.lng_entrega,
    repartidor_id=candidate.repartidor_id, ubicacion_ropa=candidate.ubicacion_ropa,
    items=candidate.items, cliente_id=candidate.cliente_id, descuento=candidate.descuento,
    costo_envio=candidate.costo_envio, es_urgente=candidate.es_urgente, servicios=candidate.servicios,
    servicios_precios=candidate.servicios_precios, subtotal=candidate.subtotal, itbis=candidate.itbis,
    total=candidate.total, saldo=candidate.saldo
    WHERE id=original.id RETURNING * INTO candidate;
  INSERT INTO public.orden_ediciones(tenant_id,orden_id,empleado_id,empleado_nombre,motivo,cambios)
    VALUES(original.tenant_id::text,p_id,actor.id::text,actor.nombre,btrim(p_reason),changes);
  RETURN jsonb_build_object('orden',to_jsonb(candidate),'cambios',changes);
END $$;

REVOKE ALL ON FUNCTION public.editar_orden(text,text,jsonb,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_orden(text,text,jsonb,text,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
