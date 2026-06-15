-- ====================================================================
-- MIGRATION: Self-healing RLS Policies and Syncing for Users/Profiles
-- Runs in Supabase SQL Editor to solve the foreign key constraint error.
-- ====================================================================

-- 1. Sync any missing users from auth.users to public.users
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  id, 
  email, 
  'participant', 
  COALESCE(created_at, NOW()), 
  COALESCE(updated_at, NOW())
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Sync any missing profiles from auth.users to public.profiles
INSERT INTO public.profiles (id, user_id, full_name, verification_status, created_at, updated_at)
SELECT 
  id, 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), 
  'incomplete', 
  COALESCE(created_at, NOW()), 
  COALESCE(updated_at, NOW())
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Add INSERT RLS policies so the API can perform self-healing inserts under the user's token
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);
