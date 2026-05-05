-- ============================================================================
-- Greenofig — Feature flag update (Migration 003)
-- Direct messaging is now Premium + VIP (was VIP-only).
-- Run this in the Supabase SQL editor.
-- ============================================================================

update public.feature_flags
set    enabled_for_tiers = array['premium', 'vip']::user_tier[]
where  feature = 'direct_messaging';
