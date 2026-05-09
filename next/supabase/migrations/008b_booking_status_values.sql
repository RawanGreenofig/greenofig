-- ============================================================================
-- Greenofig — Booking status enum values (Migration 008b)
--
-- The application code writes `status: 'scheduled'` on insert and
-- `'noShow'` from the nutritionist's calendar. Both values were missing
-- from the original `appointment_status` enum (only 'pending',
-- 'confirmed', 'cancelled', 'completed' were defined).
--
-- This is a separate migration step from 008 because Postgres rejects
-- adding enum values in the same transaction that uses them, and 008
-- references 'cancelled' in its EXCLUDE constraint predicate.
--
-- Idempotent — `add value if not exists`.
-- ============================================================================

alter type appointment_status add value if not exists 'scheduled';
alter type appointment_status add value if not exists 'noShow';
