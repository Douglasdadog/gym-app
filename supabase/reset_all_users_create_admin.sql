-- ============================================
-- Reset All Users & Create Default Admin
-- Run in Supabase SQL Editor
-- Username: admin | Password: admin123
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Delete all auth identities (must be before auth.users)
DELETE FROM auth.identities;

-- 2. Delete all users (cascades to profiles, gym_check_ins, memberships, bookings, nutrition_logs)
DELETE FROM auth.users;

-- 3. Reset gym occupancy to zero
UPDATE gym_status SET current_occupancy = 0, last_updated = NOW();

-- 4. Create default admin account (admin / admin123)
DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@cybergym.demo',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name": "Admin"}',
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_admin_id, v_admin_id, format('{"sub": "%s", "email": "admin@cybergym.demo"}', v_admin_id)::jsonb, 'email', v_admin_id, NOW(), NOW(), NOW());

  -- Ensure role column exists, then create/update profile with admin role
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
  INSERT INTO public.profiles (id, email, full_name, membership_tier, role)
  VALUES (v_admin_id, 'admin@cybergym.demo', 'Admin', 'Basic', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Admin';
END $$;
