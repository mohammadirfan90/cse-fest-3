-- ====================================================================
-- MIGRATION: Simplify fields (nullable id_back_url, simplified chk_member_source)
-- Run this in the Supabase SQL Editor.
-- ====================================================================

-- 1. Make id_back_url nullable in student_verifications
ALTER TABLE public.student_verifications ALTER COLUMN id_back_url DROP NOT NULL;

-- 2. Update chk_member_source constraint in team_members (removing id_back_url requirement and professional fields if any)
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS chk_member_source;
ALTER TABLE public.team_members ADD CONSTRAINT chk_member_source
  CHECK (
    user_id IS NOT NULL OR (
      full_name IS NOT NULL AND 
      email IS NOT NULL AND 
      university IS NOT NULL AND 
      department IS NOT NULL AND 
      semester IS NOT NULL AND 
      student_id IS NOT NULL AND 
      tshirt_size IS NOT NULL AND
      id_front_url IS NOT NULL
    )
  );
