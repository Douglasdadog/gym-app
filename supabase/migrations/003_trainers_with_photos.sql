-- Add 10 trainers with photos (run this if you already have the initial schema with 5 trainers)
-- First update existing trainers with image_url
UPDATE trainers SET image_url = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop' WHERE name = 'Alex Rivera';
UPDATE trainers SET image_url = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop' WHERE name = 'Sarah Chen';
UPDATE trainers SET image_url = 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop' WHERE name = 'Marcus Johnson';
UPDATE trainers SET image_url = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop' WHERE name = 'Elena Vasquez';
UPDATE trainers SET image_url = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop' WHERE name = 'David Park';

-- Add 5 more trainers
INSERT INTO trainers (name, specialty, bio, rating, hourly_rate_gym, hourly_rate_home, image_url) VALUES
  ('Maya Thompson', 'Boxing & Combat', 'Former amateur boxer. Teaches technique, conditioning, and self-defense.', 4.8, 80.00, 125.00, 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop'),
  ('James Wilson', 'Weightlifting', 'USAW Level 2. Olympic lifts specialist. Competed at national level.', 4.9, 85.00, 130.00, 'https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=400&h=400&fit=crop'),
  ('Nina Rodriguez', 'Pilates & Core', 'STOTT certified. Rehabilitation and core strength expert.', 4.7, 60.00, 90.00, 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=400&fit=crop'),
  ('Chris Okonkwo', 'Athletic Performance', 'Former D1 athlete. Speed, agility, and power development.', 4.9, 90.00, 140.00, 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&h=400&fit=crop'),
  ('Lily Zhang', 'Running & Endurance', 'Marathon coach. Helps runners build stamina and avoid injury.', 4.6, 55.00, 80.00, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop')
;
