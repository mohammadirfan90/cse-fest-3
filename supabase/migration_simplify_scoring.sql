-- Migration: Simplify scoring to single 0-100 score per team per competition
-- Remove multi-criteria columns
ALTER TABLE public.scores
  DROP COLUMN IF EXISTS criteria_name,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS max_score;

-- Ensure score column exists and is integer (0-100)
-- Assuming existing column "score" is numeric, cast to integer
ALTER TABLE public.scores
  ALTER COLUMN score TYPE integer USING score::integer;

-- Add constraint for valid range
ALTER TABLE public.scores
  ADD CONSTRAINT score_range CHECK (score >= 0 AND score <= 100);

-- Ensure one score per team per competition
ALTER TABLE public.scores
  ADD CONSTRAINT unique_team_comp_score UNIQUE (team_id, competition_id);

-- Optionally drop any related tables for criteria if exist (e.g., judging_criteria) – keep for compatibility
-- No further changes required for rankings; total_score will be derived from this single score.
