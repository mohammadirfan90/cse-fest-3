-- ====================================================================
-- MIGRATION: Admin-only modification access & Coordinator read-only access
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Helper function to check if user is admin OR coordinator (for read-only dashboard access)
CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND (role = 'admin' OR role = 'coordinator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Grant SELECT access to coordinators on profiles, users, and payments
DROP POLICY IF EXISTS "Coordinators can read all profiles" ON public.profiles;
CREATE POLICY "Coordinators can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Coordinators can view all records" ON public.users;
CREATE POLICY "Coordinators can view all records" ON public.users
  FOR SELECT USING (public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Coordinators can view all payments" ON public.payments;
CREATE POLICY "Coordinators can view all payments" ON public.payments
  FOR SELECT USING (public.is_admin_or_coordinator(auth.uid()));

-- 3. Restructure team_members policies so only admins have modification rights
DROP POLICY IF EXISTS "Admins can manage team member verification" ON public.team_members;
DROP POLICY IF EXISTS "Admins can read all team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can do everything on team members" ON public.team_members;

-- Allow only actual admins (in public.admins table) to perform CRUD (modification & write) operations
CREATE POLICY "Admins can do everything on team members" 
  ON public.team_members
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
