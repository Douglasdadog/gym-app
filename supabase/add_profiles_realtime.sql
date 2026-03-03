-- Add profiles to realtime so dashboard updates when membership tier changes
-- Run in Supabase SQL Editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
