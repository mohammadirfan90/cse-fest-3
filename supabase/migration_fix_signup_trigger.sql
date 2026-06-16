-- ====================================================================
-- MIGRATION: Fix handle_new_user trigger function
-- Fixes signup database error due to missing verification_status column.
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $body$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'participant')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, user_id, full_name)
  VALUES (new.id, new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;
