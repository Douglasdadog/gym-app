-- ============================================
-- FIX: "Database error querying schema" on sign in
-- Run this in Supabase SQL Editor
-- Fixes users created via SQL (admin, demo, etc.)
-- Sets required token columns to empty string (not NULL)
-- ============================================

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '');
