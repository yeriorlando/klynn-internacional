-- ====================================================================
-- MIGRACIÓN CORREGIDA DE CHAT DE WHATSAPP: Tablas con claves UUID
-- ====================================================================

-- 1. TABLA: conversations (Conversaciones)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    last_msg TEXT,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unread INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'activa', -- 'activa' | 'finalizada'
    agent TEXT NOT NULL DEFAULT 'humano' -- 'ia' | 'humano'
);

-- 2. TABLA: messages (Mensajes)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    wamid TEXT,
    payload JSONB,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reactions JSONB,
    status TEXT NOT NULL DEFAULT 'sent' -- 'sent' | 'delivered' | 'read'
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);

-- 4. Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas si ya existieran
DROP POLICY IF EXISTS "conversations_tenant_access" ON public.conversations;
DROP POLICY IF EXISTS "messages_tenant_access" ON public.messages;

-- 6. Crear políticas basadas en la vinculación del empleado al tenant
CREATE POLICY "conversations_tenant_access" ON public.conversations
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

CREATE POLICY "messages_tenant_access" ON public.messages
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

-- 7. REFRESCAR CACHE DE POSTGREST
NOTIFY pgrst, 'reload schema';
