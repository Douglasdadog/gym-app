-- Set a user as admin. Run in Supabase SQL Editor.
-- https://supabase.com/dashboard → Your Project → SQL Editor

-- 1. Ensure role column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. See all profiles (find your email)
SELECT id, email, full_name, role FROM profiles;

-- 3. Set your account as admin (replace with YOUR email from step 2)
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- For username auth (e.g. "arthur" → arthur@cybergym.local):
-- UPDATE profiles SET role = 'admin' WHERE email = 'arthur@cybergym.local';
