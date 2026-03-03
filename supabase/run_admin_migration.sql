-- ============================================
-- ADMIN RBAC MIGRATION
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ============================================

-- 1. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Admin RLS Policies - Profiles
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 4. Admin RLS Policies - Memberships
CREATE POLICY "Admins can view all memberships" ON memberships FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can update memberships" ON memberships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 5. Admin RLS Policies - Bookings
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 6. Admin RLS Policies - gym_check_ins (skip if you don't have this table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gym_check_ins') THEN
    EXECUTE 'CREATE POLICY "Admins can view all check-ins" ON gym_check_ins FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; -- Policy already exists
END $$;

-- 7. Allow 'None' for cancelled memberships
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_type_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_type_check
  CHECK (type IN ('None', 'Basic', 'Elite', 'VIP'));

-- 8. Set roles for sample accounts (user = regular user, admin = admin)
UPDATE profiles SET role = 'user' WHERE email = 'user@cybergym.demo';
UPDATE profiles SET role = 'admin' WHERE email = 'admin@cybergym.demo';
