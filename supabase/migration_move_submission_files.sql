-- Migration: Move submission files from category folders to competition slug folders
-- This script generates a list of shell commands (mv) to relocate files.
-- Actual file moves must be performed manually or via a CI step, as SQL cannot access the filesystem.

DO $$
DECLARE
  rec RECORD;
  competition_slug TEXT;
  competition_name TEXT;
  source_category TEXT;
BEGIN
  FOR rec IN SELECT id, competition_id, team_id FROM submissions LOOP
    -- Retrieve slug and name for the competition
    SELECT slug, name INTO STRICT competition_slug, competition_name FROM competitions WHERE id = rec.competition_id;
    -- Determine old category based on competition name
    SELECT CASE
      WHEN lower(competition_name) LIKE '%software%' THEN 'software'
      WHEN lower(competition_name) LIKE '%iot%' THEN 'iot'
      WHEN lower(competition_name) LIKE '%idea%' THEN 'idea'
      ELSE 'software'
    END INTO source_category;
    RAISE NOTICE 'mv % %',
      concat('storage/submissions/', source_category, '/', rec.team_id),
      concat('storage/submissions/', competition_slug, '/', rec.team_id);
  END LOOP;
END $$;

-- Note: After executing this migration, run the printed mv commands on the server file system.
