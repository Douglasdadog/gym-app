-- Backfill: Create profiles for auth.users that don't have one
-- Run in Supabase SQL Editor to fix existing users not showing in Member List

INSERT INTO public.profiles (id, email, full_name, membership_tier)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'None'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
