-- ============================================
-- CYBER-GYM FULL SETUP
-- Run this entire script in Supabase SQL Editor
-- For a newly set up Supabase project
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  membership_tier TEXT NOT NULL DEFAULT 'Basic' CHECK (membership_tier IN ('Basic', 'Elite', 'VIP')),
  current_weight DECIMAL(5,2),
  goal_weight DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GYM_STATUS (Real-time occupancy)
-- ============================================
CREATE TABLE IF NOT EXISTS gym_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_occupancy INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
  max_capacity INTEGER NOT NULL DEFAULT 100 CHECK (max_capacity > 0),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO gym_status (current_occupancy, max_capacity)
SELECT 0, 100 WHERE NOT EXISTS (SELECT 1 FROM gym_status LIMIT 1);

ALTER PUBLICATION supabase_realtime ADD TABLE gym_status;

-- ============================================
-- MEMBERSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Basic', 'Elite', 'VIP')),
  price DECIMAL(10,2) NOT NULL,
  perks JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRAINERS
-- ============================================
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  hourly_rate_gym DECIMAL(10,2) NOT NULL,
  hourly_rate_home DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('Gym', 'Home')),
  address TEXT,
  travel_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NUTRITION_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_description TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein DECIMAL(6,2) DEFAULT 0,
  carbs DECIMAL(6,2) DEFAULT 0,
  fats DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_membership_tier ON profiles(membership_tier);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_trainer_id ON bookings(trainer_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_nutrition_logs_user_id ON nutrition_logs(user_id);
CREATE INDEX idx_nutrition_logs_created_at ON nutrition_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view gym status" ON gym_status FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update gym status" ON gym_status FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view trainers" ON trainers FOR SELECT USING (true);

CREATE POLICY "Users can view own memberships" ON memberships FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own nutrition logs" ON nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nutrition logs" ON nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition logs" ON nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition logs" ON nutrition_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- SEED: 10 Sample Trainers with photos
-- ============================================
INSERT INTO trainers (name, specialty, bio, rating, hourly_rate_gym, hourly_rate_home, image_url) VALUES
  ('Alex Rivera', 'Strength & Conditioning', 'Former powerlifter, 10+ years experience. Specializes in compound movements and progressive overload.', 4.9, 75.00, 120.00, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop'),
  ('Sarah Chen', 'HIIT & Cardio', 'Certified CrossFit L2. Passionate about high-intensity interval training and metabolic conditioning.', 4.8, 65.00, 95.00, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop'),
  ('Marcus Johnson', 'Bodybuilding & Hypertrophy', 'IFBB Pro. Expert in muscle building, nutrition, and competition prep.', 5.0, 100.00, 150.00, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop'),
  ('Elena Vasquez', 'Yoga & Mobility', 'RYT-500. Focus on flexibility, recovery, and mind-body connection.', 4.7, 55.00, 85.00, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop'),
  ('David Park', 'Functional Fitness', 'NSCA-CSCS. Sports performance and injury prevention specialist.', 4.6, 70.00, 110.00, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop'),
  ('Maya Thompson', 'Boxing & Combat', 'Former amateur boxer. Teaches technique, conditioning, and self-defense.', 4.8, 80.00, 125.00, 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop'),
  ('James Wilson', 'Weightlifting', 'USAW Level 2. Olympic lifts specialist. Competed at national level.', 4.9, 85.00, 130.00, 'https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=400&h=400&fit=crop'),
  ('Nina Rodriguez', 'Pilates & Core', 'STOTT certified. Rehabilitation and core strength expert.', 4.7, 60.00, 90.00, 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=400&fit=crop'),
  ('Chris Okonkwo', 'Athletic Performance', 'Former D1 athlete. Speed, agility, and power development.', 4.9, 90.00, 140.00, 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&h=400&fit=crop'),
  ('Lily Zhang', 'Running & Endurance', 'Marathon coach. Helps runners build stamina and avoid injury.', 4.6, 55.00, 80.00, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop');

-- ============================================
-- SEED: Demo accounts (user, admin)
-- User: user / user123
-- Admin: admin / admin123
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
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

-- ============================================
-- Create profiles for seed users (trigger may not run for manual inserts)
-- ============================================
INSERT INTO profiles (id, email, full_name)
SELECT id, email, 'Demo User'
FROM auth.users
WHERE email = 'user@cybergym.demo'
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name)
SELECT id, email, 'Admin User'
FROM auth.users
WHERE email = 'admin@cybergym.demo'
ON CONFLICT (id) DO NOTHING;
