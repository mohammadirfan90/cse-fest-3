-- ====================================================================
-- MIGRATION: ADD COORDINATOR ROLE
-- Run this script in the Supabase SQL Editor to enable the role.
-- ====================================================================

-- 1. Alter check constraint for roles in public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('participant', 'admin', 'coordinator'));

-- 2. Update trigger function to prevent resetting the 'coordinator' role
CREATE OR REPLACE FUNCTION public.check_user_role_consistency()
RETURNS TRIGGER AS $$
DECLARE
  exists_in_admins BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = NEW.id) INTO exists_in_admins;

  IF exists_in_admins THEN
    NEW.role := 'admin';
  ELSIF NEW.role = 'admin' THEN
    -- If they are NOT in admins but trying to be admin, revert to participant
    NEW.role := 'participant';
  END IF;

  -- If their role is 'coordinator' or 'participant', we permit it to stay.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- How to assign this role to a user:
--
-- UPDATE public.users SET role = 'coordinator' WHERE email = 'user@example.com';
-- ====================================================================
