-- Ensure new users get membership_tier = 'None' (run 006 first to add 'None' to the check constraint)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, membership_tier)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'None')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
