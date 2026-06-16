-- Migration to add youtube_demo_url to submissions table
-- Execute this script in the Supabase SQL Editor

ALTER TABLE public.submissions
  ADD COLUMN youtube_demo_url TEXT;
