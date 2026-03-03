-- Reset gym occupancy to zero.
-- Run this in Supabase SQL Editor to fix sync issues.
-- 1. Close all active check-ins.
-- 2. Set gym_status occupancy to 0.

-- Close all active check-ins (users who haven't checked out)
UPDATE gym_check_ins
SET checked_out_at = NOW()
WHERE checked_out_at IS NULL;

-- Reset gym_status occupancy to 0
UPDATE gym_status
SET current_occupancy = 0, last_updated = NOW()
WHERE id IS NOT NULL;
