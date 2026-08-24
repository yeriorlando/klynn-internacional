-- Speeds up loading the most recent messages for a selected conversation.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time_desc
  ON public.messages (conversation_id, time DESC);
