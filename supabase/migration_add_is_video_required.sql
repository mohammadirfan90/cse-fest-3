-- Add opt-in flag for video requirement on competition submissions.
-- Default is FALSE so existing competitions (Software Showcase, Datathon, etc.)
-- keep their current behavior. Enable per-competition via a follow-up UPDATE,
-- e.g. for IOT Showcase:
--   UPDATE competitions SET is_video_required = TRUE WHERE slug = 'iot-showcase';

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS is_video_required BOOLEAN NOT NULL DEFAULT FALSE;

-- No RLS changes: the new column inherits the existing policy on
-- `public.competitions` (read for all, write gated to admins).
-- No backfill — only IOT (or any other comp) needs an explicit UPDATE.
