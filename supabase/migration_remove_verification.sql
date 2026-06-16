-- ====================================================================
-- MIGRATION: Remove Student Verification Features
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS tr_verification_notification ON public.student_verifications;
DROP FUNCTION IF EXISTS public.handle_verification_notification() CASCADE;

-- 2. Drop the v_team_members view since it references student_verifications and columns we will drop
DROP VIEW IF EXISTS public.v_team_members;

-- 3. Drop student_verifications table
DROP TABLE IF EXISTS public.student_verifications CASCADE;

-- 4. Drop verification status/URL columns from profiles and team_members
ALTER TABLE public.profiles DROP COLUMN IF EXISTS verification_status;
ALTER TABLE public.team_members DROP COLUMN IF EXISTS verification_status;
ALTER TABLE public.team_members DROP COLUMN IF EXISTS id_front_url;
ALTER TABLE public.team_members DROP COLUMN IF EXISTS id_back_url;

-- 5. Re-create public.v_team_members view without verification references
CREATE OR REPLACE VIEW public.v_team_members AS
SELECT
  tm.id AS member_id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.invitation_status,
  tm.joined_at,
  COALESCE(p.full_name, tm.full_name) AS full_name,
  COALESCE(u.email, tm.email) AS email,
  COALESCE(p.phone, tm.phone) AS phone,
  COALESCE(p.gender, tm.gender) AS gender,
  COALESCE(p.university, tm.university) AS university,
  COALESCE(p.department, tm.department) AS department,
  COALESCE(p.semester, tm.semester) AS semester,
  COALESCE(p.student_id, tm.student_id) AS student_id,
  COALESCE(p.github, tm.github) AS github,
  COALESCE(p.portfolio, tm.portfolio) AS portfolio,
  COALESCE(p.skills, tm.skills) AS skills,
  COALESCE(p.bio, tm.bio) AS bio,
  COALESCE(p.tshirt_size, tm.tshirt_size) AS tshirt_size
FROM public.team_members tm
LEFT JOIN public.users u ON tm.user_id = u.id
LEFT JOIN public.profiles p ON tm.user_id = p.id;

-- Grant select permissions on the updated view
GRANT SELECT ON public.v_team_members TO authenticated;
GRANT SELECT ON public.v_team_members TO service_role;
