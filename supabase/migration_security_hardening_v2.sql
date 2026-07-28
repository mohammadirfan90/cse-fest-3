-- ====================================================================
-- MIGRATION: Security Hardening v2 (RLS & RPC Privileges)
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Helper function to check team membership securely (avoiding RLS infinite recursion)
CREATE OR REPLACE FUNCTION public.is_team_member(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = $2 
      AND team_members.user_id = $1 
      AND (team_members.invitation_status = 'accepted' OR team_members.role = 'leader')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Restructure team_members SELECT policy to prevent public PII leakage
DROP POLICY IF EXISTS "Anyone can read team members" ON public.team_members;

CREATE POLICY "Team members and staff can read team members"
ON public.team_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User is querying their own record
    auth.uid() = user_id
    -- Or user is an accepted member/leader of the same team
    OR public.is_team_member(auth.uid(), team_id)
    -- Or user is an admin / coordinator
    OR public.is_admin_or_coordinator(auth.uid())
  )
);

-- 3. Restrict execution of get_user_id_by_email RPC to authenticated users
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
