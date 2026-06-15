-- Migration: Add slug column to competitions, backfill, then enforce NOT NULL and uniqueness
-- Step 1: Add column (nullable)
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Populate slug for existing rows
DO $$
DECLARE
  rec RECORD;
  generated_slug TEXT;
BEGIN
  FOR rec IN SELECT id, name FROM public.competitions LOOP
    generated_slug := lower(regexp_replace(rec.name, '[^a-z0-9]+', '-', 'gi'));
    IF generated_slug = '' THEN
      generated_slug := 'comp-' || gen_random_uuid()::TEXT;
    END IF;
    UPDATE public.competitions SET slug = generated_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 3: Enforce NOT NULL and uniqueness
ALTER TABLE public.competitions
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT competitions_slug_unique UNIQUE (slug);

-- Optional index for fast lookup
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON public.competitions (slug);
