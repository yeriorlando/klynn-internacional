-- Habilitar Realtime para las tablas de chat y mensajería
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
