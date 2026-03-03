-- ============================================
-- Supabase Realtime: Full Setup
-- Run in Supabase SQL Editor
-- ============================================
-- Enables Postgres Changes for: gym_status, profiles, memberships, bookings.
-- Users can insert their own membership; RLS ensures they only receive
-- realtime events for rows they can SELECT.
-- ============================================

-- 1. Add tables to supabase_realtime publication
DO $$
BEGIN
  -- gym_status (live occupancy)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gym_status') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gym_status;
  END IF;

  -- profiles (membership tier updates, dashboard sync)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  -- memberships (users insert their own; RLS filters so users only get their own row events)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'memberships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
  END IF;

  -- bookings (admin dashboard)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some tables may already be in publication: %', SQLERRM;
END $$;

-- 2. REPLICA IDENTITY FULL for tables with RLS
-- Required for UPDATE/DELETE events so Supabase can apply RLS filtering correctly.
-- Also enables receiving 'old' record values in payloads.
ALTER TABLE gym_status REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE memberships REPLICA IDENTITY FULL;
ALTER TABLE bookings REPLICA IDENTITY FULL;
