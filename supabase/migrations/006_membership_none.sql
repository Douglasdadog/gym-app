-- Allow "None" for new users without membership
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_membership_tier_check
  CHECK (membership_tier IN ('None', 'Basic', 'Elite', 'VIP'));
ALTER TABLE profiles ALTER COLUMN membership_tier SET DEFAULT 'None';
