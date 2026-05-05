-- Allow 'Elite' in user_profiles.tier and subscriptions.plan
-- Run this once in the Supabase SQL Editor.

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_tier_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_tier_check
  CHECK (tier IN ('Free', 'Basic', 'Premium', 'Elite'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('Free', 'Basic', 'Premium', 'Elite'));
