-- ============================================
-- Add role column to profiles for RBAC
-- Only role = 'admin' can access /admin/*
-- ============================================

-- Add role column (default 'user')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- Admin RLS Policies
-- Admins can read all profiles, memberships, bookings
-- Admins can update memberships (for cancellation)
-- ============================================

-- Profiles: Admins can view and update all profiles (e.g. cancel membership -> set tier to None)
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Memberships: Admins can view and update all (for cancellation)
CREATE POLICY "Admins can view all memberships" ON memberships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Admins can update memberships" ON memberships FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Bookings: Admins can view all
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- gym_check_ins: Admins can view all (for at-risk member analysis)
CREATE POLICY "Admins can view all check-ins" ON gym_check_ins FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Enable Realtime on bookings if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if already added
END $$;

-- Allow 'None' for cancelled memberships (admin cancel flow)
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_type_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_type_check
  CHECK (type IN ('None', 'Basic', 'Elite', 'VIP'));

-- Set roles for sample accounts: user = regular user, admin = admin
UPDATE profiles SET role = 'user' WHERE email = 'user@cybergym.demo';
UPDATE profiles SET role = 'admin' WHERE email = 'admin@cybergym.demo';
