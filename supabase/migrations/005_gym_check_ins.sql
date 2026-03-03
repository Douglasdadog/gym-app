-- Track user check-ins to prevent double check-in
CREATE TABLE IF NOT EXISTS gym_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ
);

-- Only one active check-in per user (checked_out_at is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_check_ins_active ON gym_check_ins (user_id) WHERE checked_out_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gym_check_ins_user ON gym_check_ins(user_id);

ALTER TABLE gym_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins" ON gym_check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-in" ON gym_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check-out" ON gym_check_ins FOR UPDATE USING (auth.uid() = user_id);
