# Registration System Refactor Plan

This document outlines the changes for the simplified and sequential registration process.

## 1. Simplified Field Set
For all registration forms (individual and teammate), we will use only:
- Full Name
- Email
- Phone
- Gender
- University
- Department
- Semester
- Student ID
- T-Shirt Size
- ID Card Photos (Front) (only one photo is enough(front))

**Removed:** GitHub, Portfolio, Skills, Bio.

## 2. Onboarding Refactor
The **Initial Profile Setup Wizard** (visible after signup) will be reduced to 3 steps:
1. **Identity**: Name, Phone, Gender.
2. **Academic**: University, Dept, Semester, Student ID.
3. **Verification**: ID card photo upload.

## 3. Team Member Registration Flow
After a leader creates a team for a competition:
1. The system automatically opens the **Team Roster Wizard**.
2. Team leader is the one who is registering by default.
3. The wizard determines the required members based on competition `min_members` and `max_members`.
4. The leader is prompted to fill in details for "Member 2", then "Member 3", and so on.
5. Each member is registered as a "Leader-Managed" (Shadow) member in the database.
6. Teammates do not have their own Supabase accounts; they are managed solely by the team leader.

## 4. Technical Implementation

### Database Changes (SQL)
Run these in the Supabase SQL Editor:
```sql
-- 1. Make id_back_url nullable in student_verifications
ALTER TABLE public.student_verifications ALTER COLUMN id_back_url DROP NOT NULL;

-- 2. Update chk_member_source constraint in team_members
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS chk_member_source;
ALTER TABLE public.team_members ADD CONSTRAINT chk_member_source
  CHECK (
    user_id IS NOT NULL OR (
      full_name IS NOT NULL AND 
      email IS NOT NULL AND 
      university IS NOT NULL AND 
      department IS NOT NULL AND 
      semester IS NOT NULL AND 
      student_id IS NOT NULL AND 
      tshirt_size IS NOT NULL AND
      id_front_url IS NOT NULL
    )
  );
```

### API Updates
- Update `addMemberSchema` in `src/app/api/teams/route.ts` to remove `github`, `portfolio`, `skills`, `bio` and make `id_back_base64` optional.
- Update `profileSchema` in `src/app/api/profile/route.ts` similarly.

### UI Updates
- **Profile Setup Wizard**: Simplify to 3 steps (Identity -> Academic -> Verification).
- **Sequential Team Registration**: After team creation, guide the leader through registering Member 2, Member 3, etc., up to the competition's maximum limit.
