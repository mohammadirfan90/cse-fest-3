-- Migration to replace google_docs_url with local file paths for submissions

ALTER TABLE public.submissions
  DROP COLUMN IF EXISTS google_docs_url;

ALTER TABLE public.submissions
  ADD COLUMN pdf_path TEXT NOT NULL DEFAULT '',
  ADD COLUMN video_path TEXT;

-- Remove default from pdf_path so new rows must explicitly supply it
ALTER TABLE public.submissions
  ALTER COLUMN pdf_path DROP DEFAULT;
