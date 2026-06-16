-- ====================================================================
-- CSE FEST 2026 DATABASE SCHEMA
-- Execute this script in the Supabase SQL Editor (manual execution)
-- ====================================================================

-- 1. Create Enums / Type Constraints (Using CHECK constraints on columns for ease)
-- Status Enums used:
-- VerificationStatus: 'incomplete', 'pending', 'verified'
-- SubmissionStatus: 'draft', 'submitted', 'under_review', 'selected', 'rejected'
-- PaymentStatus: 'pending', 'approved', 'rejected', 'resubmission_required'
-- CompetitionStatus: 'draft', 'published', 'registration_open', 'registration_closed', 'archived'
-- TeamStatus: 'forming', 'registered', 'submitted', 'selected', 'rejected', 'finalist'

-- 2. Create Tables

-- public.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.admins
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  gender TEXT,
  university TEXT,
  department TEXT,
  semester TEXT,
  student_id TEXT,
  github TEXT,
  portfolio TEXT,
  skills TEXT[] DEFAULT '{}',
  bio TEXT,
  tshirt_size TEXT,
  verification_status TEXT NOT NULL DEFAULT 'incomplete' CHECK (verification_status IN ('incomplete', 'pending', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.student_verifications
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  id_front_url TEXT NOT NULL,
  id_back_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('incomplete', 'pending', 'verified')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.competitions
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Showcase', 'Programming', 'Security', 'Robotics', 'Esports', 'Custom')),
  description TEXT,
  short_description TEXT,
  cover_image_url TEXT,
  banner_image_url TEXT,
  eligibility TEXT NOT NULL DEFAULT 'both' CHECK (eligibility IN ('internal', 'external', 'both')),
  solo_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  team_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  min_members INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 4,
  registration_start TIMESTAMPTZ NOT NULL,
  registration_end TIMESTAMPTZ NOT NULL,
  submission_start TIMESTAMPTZ NOT NULL,
  submission_end TIMESTAMPTZ NOT NULL,
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  payment_instructions TEXT,
  submission_required BOOLEAN NOT NULL DEFAULT TRUE,
  template_link TEXT,
  rulebook_url TEXT,
  judging_criteria JSONB NOT NULL DEFAULT '[]', -- Array of { name: string, weight: number }
  finalist_limit INTEGER NOT NULL DEFAULT 20,
  prize_pool TEXT,
  champion_prize TEXT,
  runner_up_prize TEXT,
  second_runner_up TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_open', 'registration_closed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'registered', 'submitted', 'selected', 'rejected', 'finalist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, competition_id)
);

-- public.team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

-- public.submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  google_docs_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'selected', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(team_id, competition_id)
);

-- public.payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  screenshot_url TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('bkash', 'nagad')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resubmission_required')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.scores
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  entered_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.rankings
CREATE TABLE IF NOT EXISTS public.rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL DEFAULT 0,
  rank_position INTEGER,
  is_finalist BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'competition', 'results', 'deadline', 'emergency')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  publish_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.ticker_items
CREATE TABLE IF NOT EXISTS public.ticker_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.faqs
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.contact_info
CREATE TABLE IF NOT EXISTS public.contact_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  facebook TEXT,
  linkedin TEXT,
  address TEXT,
  maps_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Functions & Sync Triggers

-- Helper to check if a user is an admin bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Automatically populates users & profiles on auth signup
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync user role when added/removed from public.admins
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.users
    SET role = 'admin'
    WHERE id = NEW.id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.users
    SET role = 'participant'
    WHERE id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_admin_role ON public.admins;
CREATE TRIGGER tr_sync_admin_role
AFTER INSERT OR DELETE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role();

-- Trigger to enforce consistency on user updates (ensures role matches admin table membership)
CREATE OR REPLACE FUNCTION public.check_user_role_consistency()
RETURNS TRIGGER AS $$
DECLARE
  exists_in_admins BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = NEW.id) INTO exists_in_admins;

  IF exists_in_admins THEN
    NEW.role := 'admin';
  ELSE
    NEW.role := 'participant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_user_role_consistency ON public.users;
CREATE TRIGGER tr_check_user_role_consistency
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_user_role_consistency();

-- 4. Enable Row Level Security (RLS)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies

-- USERS Table Policies
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Admins can view all records" ON public.users;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
CREATE POLICY "Users can view their own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all records" ON public.users FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update user roles" ON public.users FOR UPDATE USING (public.is_admin(auth.uid()));

-- ADMINS Table Policies
DROP POLICY IF EXISTS "Admins can view all admin records" ON public.admins;
CREATE POLICY "Admins can view all admin records" ON public.admins FOR SELECT USING (public.is_admin(auth.uid()));

-- PROFILES Table Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));

-- STUDENT_VERIFICATIONS Table Policies
DROP POLICY IF EXISTS "Users can read own verification" ON public.student_verifications;
DROP POLICY IF EXISTS "Users can create own verification" ON public.student_verifications;
DROP POLICY IF EXISTS "Users can update own verification" ON public.student_verifications;
DROP POLICY IF EXISTS "Admins can read/write all verifications" ON public.student_verifications;
CREATE POLICY "Users can read own verification" ON public.student_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own verification" ON public.student_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verification" ON public.student_verifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read/write all verifications" ON public.student_verifications USING (public.is_admin(auth.uid()));

-- COMPETITIONS Table Policies
DROP POLICY IF EXISTS "Public read active competitions" ON public.competitions;
DROP POLICY IF EXISTS "Admins can do everything on competitions" ON public.competitions;
CREATE POLICY "Public read active competitions" ON public.competitions FOR SELECT USING (status != 'draft');
CREATE POLICY "Admins can do everything on competitions" ON public.competitions USING (public.is_admin(auth.uid()));

-- TEAMS Table Policies
DROP POLICY IF EXISTS "Anyone can read teams" ON public.teams;
DROP POLICY IF EXISTS "Team leader can create team" ON public.teams;
DROP POLICY IF EXISTS "Team leader can update team details" ON public.teams;
DROP POLICY IF EXISTS "Admins can do everything on teams" ON public.teams;
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Team leader can create team" ON public.teams FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Team leader can update team details" ON public.teams FOR UPDATE USING (auth.uid() = leader_id);
CREATE POLICY "Admins can do everything on teams" ON public.teams USING (public.is_admin(auth.uid()));

-- TEAM_MEMBERS Table Policies
DROP POLICY IF EXISTS "Anyone can read team members" ON public.team_members;
DROP POLICY IF EXISTS "Leader/members can edit team invitations" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can add/remove members" ON public.team_members;
CREATE POLICY "Anyone can read team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Leader/members can edit team invitations" ON public.team_members USING (auth.uid() = user_id);
CREATE POLICY "Team leaders can add/remove members" ON public.team_members USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = team_id AND leader_id = auth.uid()
  )
);

-- SUBMISSIONS Table Policies
DROP POLICY IF EXISTS "Team members can read own team submissions" ON public.submissions;
DROP POLICY IF EXISTS "Team members can create/edit own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can read/write all submissions" ON public.submissions;
CREATE POLICY "Team members can read own team submissions" ON public.submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = submissions.team_id AND user_id = auth.uid() AND invitation_status = 'accepted'
  )
);
CREATE POLICY "Team members can create/edit own submissions" ON public.submissions USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = submissions.team_id AND user_id = auth.uid() AND invitation_status = 'accepted'
  )
);
CREATE POLICY "Admins can read/write all submissions" ON public.submissions USING (public.is_admin(auth.uid()));

-- PAYMENTS Table Policies
DROP POLICY IF EXISTS "Team members can read own team payments" ON public.payments;
DROP POLICY IF EXISTS "Team members can submit payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can review payments" ON public.payments;
CREATE POLICY "Team members can read own team payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = payments.team_id AND user_id = auth.uid() AND invitation_status = 'accepted'
  )
);
CREATE POLICY "Team members can submit payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = payments.team_id AND user_id = auth.uid() AND invitation_status = 'accepted'
  )
);
CREATE POLICY "Admins can review payments" ON public.payments USING (public.is_admin(auth.uid()));

-- SCORES Table Policies
DROP POLICY IF EXISTS "Team members can view own team scores" ON public.scores;
DROP POLICY IF EXISTS "Admins can read/write scores" ON public.scores;
CREATE POLICY "Team members can view own team scores" ON public.scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = scores.team_id AND user_id = auth.uid() AND invitation_status = 'accepted'
  )
);
CREATE POLICY "Admins can read/write scores" ON public.scores USING (public.is_admin(auth.uid()));

-- RANKINGS Table Policies
DROP POLICY IF EXISTS "Public read if rankings are public" ON public.rankings;
DROP POLICY IF EXISTS "Admins can read/write all rankings" ON public.rankings;
CREATE POLICY "Public read if rankings are public" ON public.rankings FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can read/write all rankings" ON public.rankings USING (public.is_admin(auth.uid()));

-- NOTIFICATIONS Table Policies
DROP POLICY IF EXISTS "Users can read/write own notifications" ON public.notifications;
CREATE POLICY "Users can read/write own notifications" ON public.notifications USING (auth.uid() = user_id);

-- CMS Tables Public Read, Admin Write Policies
DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin write announcements" ON public.announcements;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (status = 'published');
CREATE POLICY "Admin write announcements" ON public.announcements USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read ticker items" ON public.ticker_items;
DROP POLICY IF EXISTS "Admin write ticker items" ON public.ticker_items;
CREATE POLICY "Public read ticker items" ON public.ticker_items FOR SELECT USING (active = true);
CREATE POLICY "Admin write ticker items" ON public.ticker_items USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admin write faqs" ON public.faqs;
CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (visible = true);
CREATE POLICY "Admin write faqs" ON public.faqs USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read contact info" ON public.contact_info;
DROP POLICY IF EXISTS "Admin write contact info" ON public.contact_info;
CREATE POLICY "Public read contact info" ON public.contact_info FOR SELECT USING (true);
CREATE POLICY "Admin write contact info" ON public.contact_info USING (public.is_admin(auth.uid()));

-- AUDIT_LOGS Table Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System/Admins can write audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System/Admins can write audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

