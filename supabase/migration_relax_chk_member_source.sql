-- ====================================================================
-- MIGRATION: Relax chk_member_source constraint in team_members
-- Drops the ID card requirement (id_front_url IS NOT NULL) for manual team members.
-- Run this in the Supabase SQL Editor.
-- ====================================================================

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
      tshirt_size IS NOT NULL
    )
  );
