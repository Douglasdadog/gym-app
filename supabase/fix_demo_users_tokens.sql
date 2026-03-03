-- ============================================
-- FIX: "Database error querying schema" on sign in
-- Run this to fix demo users created via SQL
-- Sets required token columns to empty string (not NULL)
-- ============================================

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE email IN ('user@cybergym.demo', 'admin@cybergym.demo');
