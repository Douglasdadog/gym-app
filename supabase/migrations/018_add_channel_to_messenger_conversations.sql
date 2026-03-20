-- Tag each Meta conversation message with its channel so admin can view IG + Messenger together.
ALTER TABLE public.messenger_conversations
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'messenger';

-- Backfill existing rows if needed.
UPDATE public.messenger_conversations
SET channel = 'messenger'
WHERE channel IS NULL;

-- Helpful index for conversation list queries.
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_channel_created_at
ON public.messenger_conversations(channel, created_at DESC);
