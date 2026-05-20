-- ====================================================================
-- MIGRACIÓN: Arreglar RPC reservar_proximo_ncf (Error operator does not exist: uuid = text)
-- ====================================================================

-- Primero eliminamos cualquier versión anterior para evitar conflictos de tipo de datos
DROP FUNCTION IF EXISTS public.reservar_proximo_ncf(uuid, text);
DROP FUNCTION IF EXISTS public.reservar_proximo_ncf(text, text);

-- Recreamos la función con tipos TEXT (que coinciden con la tabla ecf_sequences en Klynn)
CREATE OR REPLACE FUNCTION public.reservar_proximo_ncf(p_tenant_id TEXT, p_tipo_ecf TEXT)
RETURNS TABLE(ncf TEXT, expiration_date TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seq_id TEXT;
    v_prefijo TEXT;
    v_valor_actual INTEGER;
    v_valor_final INTEGER;
    v_ncf TEXT;
    v_expiration_date TEXT;
BEGIN
    -- Bloquear la fila para evitar condiciones de carrera (concurrency) al generar números
    SELECT id, prefijo, valor_actual, valor_final, ecf_sequences.expiration_date
    INTO v_seq_id, v_prefijo, v_valor_actual, v_valor_final, v_expiration_date
    FROM public.ecf_sequences
    WHERE tenant_id = p_tenant_id
      AND tipo_ecf = p_tipo_ecf
      AND is_active = true
    FOR UPDATE SKIP LOCKED;

    -- Si no hay secuencia activa o se agotó el rango, retornamos vacío
    IF v_seq_id IS NULL OR v_valor_actual >= v_valor_final THEN
        RETURN;
    END IF;

    -- Incrementar valor
    v_valor_actual := v_valor_actual + 1;

    -- Generar NCF (Ej. B0200000001 -> Prefijo(3) + Número(8) = 11 caracteres)
    -- Los prefijos e-CF son E31, E32... (3 caracteres) + 10 números = 13 caracteres,
    -- PERO la lógica LPAD de 8 o 10 depende del prefijo. Para Pronesoft,
    -- e-CF son 13 (E31 + 10 números). NCF son 11 (B02 + 8 números).
    IF LENGTH(v_prefijo) > 0 AND LEFT(v_prefijo, 1) = 'E' THEN
        v_ncf := v_prefijo || lpad(v_valor_actual::text, 10, '0');
    ELSE
        v_ncf := v_prefijo || lpad(v_valor_actual::text, 8, '0');
    END IF;

    -- Actualizar el valor actual en la base de datos
    UPDATE public.ecf_sequences
    SET valor_actual = v_valor_actual
    WHERE id = v_seq_id;

    -- Retornar el NCF generado
    RETURN QUERY SELECT v_ncf, v_expiration_date;
END;
$$;
