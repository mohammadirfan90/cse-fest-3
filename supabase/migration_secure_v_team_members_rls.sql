-- ====================================================================
-- MIGRATION: Secure v_team_members View with RLS (Security Invoker)
-- Run this script in the Supabase SQL Editor.
-- This ensures the view respects Row-Level Security (RLS) policies 
-- of the underlying tables, preventing unauthorized PII exposure.
-- ====================================================================

-- 1. Drop existing view
DROP VIEW IF EXISTS public.v_team_members;

-- 2. Recreate view with security_invoker enabled
CREATE OR REPLACE VIEW public.v_team_members 
WITH (security_invoker = true) AS
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

-- 3. Grant select access to authenticated users and service role
GRANT SELECT ON public.v_team_members TO authenticated;
GRANT SELECT ON public.v_team_members TO service_role;
