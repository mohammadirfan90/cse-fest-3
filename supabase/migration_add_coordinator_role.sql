-- ====================================================================
-- MIGRATION: ADD COORDINATOR ROLE
-- Run this script in the Supabase SQL Editor to enable the role.
-- ====================================================================

-- 1. Alter check constraint for roles in public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('participant', 'admin', 'coordinator'));

-- ====================================================================
-- How to assign this role to a user:
--
-- UPDATE public.users SET role = 'coordinator' WHERE email = 'user@example.com';
-- ====================================================================
