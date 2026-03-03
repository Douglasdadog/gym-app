-- Allow users to purchase/insert their own memberships (fixes "Failed to purchase")
CREATE POLICY "Users can insert own memberships" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
