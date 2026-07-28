-- ====================================================================
-- MIGRATION: Add 'waiting' status to teams
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- Drop the old constraint
ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_status_check;

-- Create the new constraint including 'waiting'
ALTER TABLE public.teams
  ADD CONSTRAINT teams_status_check
  CHECK (status IN ('forming', 'registered', 'submitted', 'selected', 'rejected', 'finalist', 'judging_ready', 'waiting'));

-- Grant access
GRANT UPDATE, SELECT ON public.teams TO authenticated;
