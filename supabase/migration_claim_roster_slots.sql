-- ====================================================================
-- MIGRATION: Auto-Claim Team Member Slots
-- Run this in the Supabase SQL Editor.
-- ====================================================================

-- 1. Backfill: Link existing users to any orphaned team member slots
UPDATE public.team_members tm
SET user_id = u.id
FROM public.users u
WHERE LOWER(TRIM(tm.email)) = LOWER(TRIM(u.email))
  AND tm.user_id IS NULL;

-- 2. Trigger enhancement: Auto-claim slots for future user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $body$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'participant')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, user_id, full_name)
  VALUES (new.id, new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  -- Auto-claim any existing team member slots
  UPDATE public.team_members
  SET user_id = new.id
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(new.email))
    AND user_id IS NULL;

  RETURN new;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policy: Allow users to claim their own slots through direct API updates
DROP POLICY IF EXISTS "Users can claim their own team member slots" ON public.team_members;
CREATE POLICY "Users can claim their own team member slots" ON public.team_members
  FOR UPDATE
  USING (LOWER(TRIM(email)) = auth.jwt() ->> 'email' AND user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
