-- Deduplicate webhook deliveries: only process each message_id once (avoids double reply).
CREATE TABLE IF NOT EXISTS webhook_processed_message_ids (
  message_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: remove old rows to keep table small (e.g. older than 7 days)
-- Run periodically or via cron: DELETE FROM webhook_processed_message_ids WHERE created_at < NOW() - INTERVAL '7 days';
