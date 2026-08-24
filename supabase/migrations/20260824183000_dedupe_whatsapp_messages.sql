-- Evita conversaciones y mensajes duplicados cuando el proveedor reintenta
-- un webhook o cuando dos eventos llegan al mismo tiempo.

-- Consolidar conversaciones históricas repetidas por tenant y teléfono.
WITH ranked_conversations AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, phone
      ORDER BY time DESC, id DESC
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY tenant_id, phone
      ORDER BY time DESC, id DESC
    ) AS position
  FROM public.conversations
)
UPDATE public.messages AS message
SET conversation_id = ranked.keeper_id
FROM ranked_conversations AS ranked
WHERE ranked.position > 1
  AND message.conversation_id = ranked.id;

WITH ranked_conversations AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, phone
      ORDER BY time DESC, id DESC
    ) AS position
  FROM public.conversations
)
DELETE FROM public.conversations AS conversation
USING ranked_conversations AS ranked
WHERE conversation.id = ranked.id
  AND ranked.position > 1;

-- Conservar una sola copia de cada mensaje externo ya almacenado.
WITH ranked_messages AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, wamid
      ORDER BY time ASC, id ASC
    ) AS position
  FROM public.messages
  WHERE wamid IS NOT NULL
    AND wamid <> ''
)
DELETE FROM public.messages AS message
USING ranked_messages AS ranked
WHERE message.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_tenant_phone_unique
  ON public.conversations (tenant_id, phone);

CREATE UNIQUE INDEX IF NOT EXISTS messages_tenant_wamid_unique
  ON public.messages (tenant_id, wamid)
  WHERE wamid IS NOT NULL AND wamid <> '';

