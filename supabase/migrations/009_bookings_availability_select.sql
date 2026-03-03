-- Allow authenticated users to view all bookings (for availability/calendar)
-- Needed so users can see which slots are taken when booking a trainer
CREATE POLICY "Authenticated can view all bookings for availability" ON bookings
  FOR SELECT USING (auth.role() = 'authenticated');
