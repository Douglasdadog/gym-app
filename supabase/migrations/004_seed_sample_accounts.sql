-- ============================================
-- Seed Sample Accounts for Testing
-- User: user / user123
-- Admin: admin / admin123
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  -- 1. Create USER account (user / user123)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user@cybergym.demo') THEN
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'user@cybergym.demo',
    crypt('user123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name": "Demo User"}',
    NOW(),
    NOW()
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, format('{"sub": "%s", "email": "user@cybergym.demo"}', v_user_id)::jsonb, 'email', v_user_id, NOW(), NOW(), NOW());
  END IF;

  -- 2. Create ADMIN account (admin / admin123)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@cybergym.demo') THEN
  v_admin_id := gen_random_uuid();
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
    '{"full_name": "Admin User"}',
    NOW(),
    NOW()
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_admin_id, v_admin_id, format('{"sub": "%s", "email": "admin@cybergym.demo"}', v_admin_id)::jsonb, 'email', v_admin_id, NOW(), NOW(), NOW());
  END IF;

END $$;
