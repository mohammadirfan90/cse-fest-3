-- Hardened Security Migrations — CSE Fest 2026

-- 1. Privilege Escalation Prevention Trigger on users
CREATE OR REPLACE FUNCTION public.check_users_role_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent authenticated users from changing their own role, except if they are already admin
  IF NEW.role <> OLD.role AND auth.role() = 'authenticated' AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Privilege escalation blocked: Normal users cannot modify user roles.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_users_role ON public.users;
CREATE TRIGGER tr_check_users_role
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_users_role_immutable();


-- 2. Race Condition & Enrollment Limit Trigger on team_members
CREATE OR REPLACE FUNCTION public.check_user_competition_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_id UUID;
  v_already_registered BOOLEAN;
BEGIN
  -- Get the competition_id of the target team
  SELECT competition_id INTO v_competition_id
  FROM public.teams
  WHERE id = NEW.team_id;

  -- Check if user is already registered in a team for this competition
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.user_id = NEW.user_id 
      AND t.competition_id = v_competition_id
      AND tm.team_id <> NEW.team_id
  ) INTO v_already_registered;

  IF v_already_registered THEN
    RAISE EXCEPTION 'Enrollment limit exceeded: You are already registered in a team for this competition.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_user_competition_limit ON public.team_members;
CREATE TRIGGER tr_check_user_competition_limit
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.check_user_competition_limit();


-- 3. Automatic Write-Only Audit Logging Triggers
CREATE OR REPLACE FUNCTION public.audit_score_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (admin_id, action, resource_type, resource_id, previous_value, new_value)
  VALUES (
    auth.uid(),
    TG_OP,
    'scores',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN jsonb_build_object('score', OLD.score, 'criteria', OLD.criteria_name, 'team_id', OLD.team_id) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN jsonb_build_object('score', NEW.score, 'criteria', NEW.criteria_name, 'team_id', NEW.team_id) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_score_mutation ON public.scores;
CREATE TRIGGER tr_audit_score_mutation
AFTER INSERT OR UPDATE OR DELETE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.audit_score_changes();
