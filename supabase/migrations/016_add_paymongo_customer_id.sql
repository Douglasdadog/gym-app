-- Store PayMongo customer ID for saved payment methods (card vaulting).
-- When set, the user can have cards saved and charged automatically.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paymongo_customer_id TEXT;
