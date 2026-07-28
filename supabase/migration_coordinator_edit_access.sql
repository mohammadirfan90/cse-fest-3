-- ====================================================================
-- MIGRATION: Coordinator & Admin Full Edit Access
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Profiles update policy for admins & coordinators
DROP POLICY IF EXISTS "Admins/Coordinators can update all profiles" ON public.profiles;
CREATE POLICY "Admins/Coordinators can update all profiles" ON public.profiles
  FOR UPDATE 
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- 2. Users update policy for admins & coordinators (for editing email/role)
DROP POLICY IF EXISTS "Admins/Coordinators can update all user records" ON public.users;
CREATE POLICY "Admins/Coordinators can update all user records" ON public.users
  FOR UPDATE 
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- 3. Teams policy update for admins & coordinators (covers INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can do everything on teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can update team status" ON public.teams;
DROP POLICY IF EXISTS "Admins/Coordinators can do everything on teams" ON public.teams;

CREATE POLICY "Admins/Coordinators can do everything on teams" ON public.teams
  FOR ALL 
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- 4. Team Members policy update for admins & coordinators (covers INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can do everything on team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins/Coordinators can do everything on team members" ON public.team_members;

CREATE POLICY "Admins/Coordinators can do everything on team members" ON public.team_members
  FOR ALL 
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
