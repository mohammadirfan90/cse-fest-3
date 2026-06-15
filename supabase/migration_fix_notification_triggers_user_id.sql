-- Migration to fix notification triggers when teams contain leader-managed (ghost) members
-- Run this in the Supabase SQL Editor.

-- 1. Fix Proposal Submission Inserted Trigger Function
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


-- 2. Fix Submission Reviewed Trigger Function
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


-- 3. Fix Payment Submitted Trigger Function
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


-- 4. Fix Payment Decision Trigger Function
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


-- 5. Fix Team Finalist Trigger Function
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
