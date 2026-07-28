-- ====================================================================
-- MIGRATION: ADD SENDER NUMBER TO PAYMENTS
-- Run this script in the Supabase SQL Editor to update schema.
-- ====================================================================

-- 1. Make screenshot_url column nullable (since screenshots are optional now)
ALTER TABLE public.payments ALTER COLUMN screenshot_url DROP NOT NULL;

-- 2. Add sender_number column to public.payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sender_number TEXT;
