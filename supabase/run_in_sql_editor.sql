-- ============================================
-- Copy & paste this entire file into Supabase SQL Editor
-- ============================================

-- 1. Allow "None" for new users without membership
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_membership_tier_check
  CHECK (membership_tier IN ('None', 'Basic', 'Elite', 'VIP'));
ALTER TABLE profiles ALTER COLUMN membership_tier SET DEFAULT 'None';

-- 2. Allow users to purchase/insert their own memberships (fixes "Failed to purchase")
CREATE POLICY "Users can insert own memberships" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Ensure new users get membership_tier = 'None'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, membership_tier)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'None')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
