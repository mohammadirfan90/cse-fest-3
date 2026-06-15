-- Migration: Add two‑stage publish fields to competitions table
-- Adds boolean flags to control preliminary and final leaderboard publication
-- These columns are used by the publish API and UI to enforce the workflow

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS preliminary_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_published boolean NOT NULL DEFAULT false;

-- Ensure logical consistency: final can only be true when preliminary is true
ALTER TABLE public.competitions
  ADD CONSTRAINT chk_publish_flow CHECK (
    final_published = false OR preliminary_published = true
  );

-- Optional: index for faster queries on publish state
CREATE INDEX IF NOT EXISTS idx_competitions_preliminary_published ON public.competitions (preliminary_published);
CREATE INDEX IF NOT EXISTS idx_competitions_final_published ON public.competitions (final_published);
