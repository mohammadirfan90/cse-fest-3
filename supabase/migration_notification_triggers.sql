-- ====================================================================
-- MIGRATION: Notification Triggers
-- Automates creation of in-app notifications on database state changes.
-- Resolves RLS insert blocks on client-side and keeps APIs clean.
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Student Verification Trigger (Approve / Reject & Sync to Profiles)
CREATE OR REPLACE FUNCTION public.handle_verification_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync verification status to public.profiles table automatically
  UPDATE public.profiles
  SET 
    verification_status = NEW.status,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  -- Create notification if status changed
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'verified' THEN
      INSERT INTO public.notifications (user_id, title, message, type, action_url)
      VALUES (
        NEW.user_id,
        'Student ID Verified ✅',
        'Your Student ID has been verified! You can now create teams and register for competitions.',
        'success',
        '/dashboard'
      );
    ELSIF NEW.status = 'incomplete' THEN
      INSERT INTO public.notifications (user_id, title, message, type, action_url)
      VALUES (
        NEW.user_id,
        'Student ID Rejected ❌',
        'Your Student ID was rejected. Please re-upload clear photos of the front and back of your ID.',
        'error',
        '/profile-setup'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_verification_notification ON public.student_verifications;
CREATE TRIGGER tr_verification_notification
  AFTER UPDATE ON public.student_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_verification_notification();



-- 2. Team Invitation Trigger (When leader invites a user)
CREATE OR REPLACE FUNCTION public.handle_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_competition_name TEXT;
BEGIN
  IF NEW.invitation_status = 'pending' THEN
    SELECT t.name, c.name
    INTO v_team_name, v_competition_name
    FROM public.teams t
    JOIN public.competitions c ON t.competition_id = c.id
    WHERE t.id = NEW.team_id;

    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Team Invitation 📩',
      'You have been invited to join the team "' || v_team_name || '" for "' || v_competition_name || '".',
      'info',
      '/teams'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_invitation_notification ON public.team_members;
CREATE TRIGGER tr_invitation_notification
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_notification();


-- 3. Invitation Accepted Trigger (When member accepts invite)
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_leader_id UUID;
  v_invitee_name TEXT;
BEGIN
  IF NEW.invitation_status = 'accepted' AND OLD.invitation_status = 'pending' THEN
    SELECT t.name, t.leader_id
    INTO v_team_name, v_leader_id
    FROM public.teams t
    WHERE t.id = NEW.team_id;

    SELECT p.full_name
    INTO v_invitee_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      v_leader_id,
      'Invitation Accepted 🎉',
      COALESCE(v_invitee_name, 'A user') || ' accepted your invitation to join "' || v_team_name || '".',
      'success',
      '/teams'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_invitation_accepted_notification ON public.team_members;
CREATE TRIGGER tr_invitation_accepted_notification
  AFTER UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_accepted_notification();


-- 4. Proposal Submission Created Trigger (Initial submission)
CREATE OR REPLACE FUNCTION public.handle_submission_inserted_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_member_id UUID;
BEGIN
  SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;

  FOR v_member_id IN 
    SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id AND invitation_status = 'accepted' AND user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      v_member_id,
      'Proposal Submitted 🚀',
      'Your team "' || v_team_name || '" successfully submitted the proposal "' || NEW.title || '".',
      'success',
      '/submissions'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_submission_inserted_notification ON public.submissions;
CREATE TRIGGER tr_submission_inserted_notification
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_submission_inserted_notification();


-- 5. Submission Reviewed Trigger (Selected / Rejected by Admin)
CREATE OR REPLACE FUNCTION public.handle_submission_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_member_id UUID;
BEGIN
  IF NEW.status != OLD.status THEN
    SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;

    FOR v_member_id IN 
      SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id AND invitation_status = 'accepted' AND user_id IS NOT NULL
    LOOP
      IF NEW.status = 'selected' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Submission Selected 🎉',
          'Your project submission for team "' || v_team_name || '" has been selected! Please proceed to the payment stage.',
          'success',
          '/submissions'
        );
      ELSIF NEW.status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Submission Rejected ❌',
          'Your project submission for team "' || v_team_name || '" was rejected.',
          'error',
          '/submissions'
        );
      ELSIF NEW.status = 'under_review' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Project Under Review ⏳',
          'Your project proposal for team "' || v_team_name || '" is now under review by organizers.',
          'info',
          '/submissions'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_submission_notification ON public.submissions;
CREATE TRIGGER tr_submission_notification
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_submission_notification();


-- 6. Payment Submitted Trigger (Initial payment proof)
CREATE OR REPLACE FUNCTION public.handle_payment_inserted_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_member_id UUID;
BEGIN
  SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;

  FOR v_member_id IN 
    SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id AND invitation_status = 'accepted' AND user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      v_member_id,
      'Payment Submitted 💳',
      'Payment of BDT ' || NEW.amount || ' has been submitted for team "' || v_team_name || '". Pending verification.',
      'info',
      '/payments'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_payment_inserted_notification ON public.payments;
CREATE TRIGGER tr_payment_inserted_notification
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_inserted_notification();


-- 7. Payment Decision Trigger (Approved / Rejected / Resubmission by Admin)
CREATE OR REPLACE FUNCTION public.handle_payment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_team_name TEXT;
  v_member_id UUID;
BEGIN
  IF NEW.status != OLD.status THEN
    SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;

    FOR v_member_id IN 
      SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id AND invitation_status = 'accepted' AND user_id IS NOT NULL
    LOOP
      IF NEW.status = 'approved' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Payment Approved 💳',
          'Your payment of BDT ' || NEW.amount || ' for team "' || v_team_name || '" has been approved. You are now a confirmed Finalist!',
          'success',
          '/payments'
        );
      ELSIF NEW.status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Payment Rejected ❌',
          'Your payment of BDT ' || NEW.amount || ' for team "' || v_team_name || '" was rejected. Please contact support.',
          'error',
          '/payments'
        );
      ELSIF NEW.status = 'resubmission_required' THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          v_member_id,
          'Payment Resubmission Required ⚠️',
          'Organizers requested resubmission for payment of BDT ' || NEW.amount || ' for team "' || v_team_name || '". Please upload correct details.',
          'warning',
          '/payments'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_payment_notification ON public.payments;
CREATE TRIGGER tr_payment_notification
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_notification();


-- 8. Team Finalist Trigger (When team is marked as finalist)
CREATE OR REPLACE FUNCTION public.handle_team_finalist_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_member_id UUID;
  v_competition_name TEXT;
BEGIN
  IF NEW.status = 'finalist' AND OLD.status != 'finalist' THEN
    SELECT name INTO v_competition_name FROM public.competitions WHERE id = NEW.competition_id;

    FOR v_member_id IN 
      SELECT user_id FROM public.team_members WHERE team_id = NEW.id AND invitation_status = 'accepted' AND user_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, action_url)
      VALUES (
        v_member_id,
        'Finalist Confirmed! 🏆',
        'Congratulations! Your team "' || NEW.name || '" has been selected as a finalist for "' || COALESCE(v_competition_name, 'the competition') || '".',
        'success',
        '/dashboard'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_team_finalist_notification ON public.teams;
CREATE TRIGGER tr_team_finalist_notification
  AFTER UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_team_finalist_notification();


-- ====================================================================
-- ONE-TIME CLEANUP: Sync any mismatched profiles with student_verifications status
-- ====================================================================
UPDATE public.profiles p
SET verification_status = sv.status, updated_at = NOW()
FROM public.student_verifications sv
WHERE p.id = sv.user_id AND p.verification_status != sv.status;

