# Database Architecture & Schema Reference

The CSE Fest 2026 platform uses PostgreSQL managed via Supabase. Row Level Security (RLS) is enabled on all tables, and database integrity is maintained through constraints, custom triggers, and security definer functions.

---

## 📊 Database Views

### `public.v_team_members`
A database view that coalesces teammate details. This enables querying both pre-registered users (referencing `public.profiles` and `public.users`) and offline invitees (whose details are pre-filled directly in `team_members` columns) through a single unified view.

```sql
CREATE OR REPLACE VIEW public.v_team_members AS
SELECT
  tm.id AS member_id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.invitation_status,
  tm.joined_at,
  COALESCE(p.full_name, tm.full_name) AS full_name,
  COALESCE(u.email, tm.email) AS email,
  COALESCE(p.phone, tm.phone) AS phone,
  COALESCE(p.gender, tm.gender) AS gender,
  COALESCE(p.university, tm.university) AS university,
  COALESCE(p.department, tm.department) AS department,
  COALESCE(p.semester, tm.semester) AS semester,
  COALESCE(p.student_id, tm.student_id) AS student_id,
  COALESCE(p.github, tm.github) AS github,
  COALESCE(p.portfolio, tm.portfolio) AS portfolio,
  COALESCE(p.skills, tm.skills) AS skills,
  COALESCE(p.bio, tm.bio) AS bio,
  COALESCE(p.tshirt_size, tm.tshirt_size) AS tshirt_size
FROM public.team_members tm
LEFT JOIN public.users u ON tm.user_id = u.id
LEFT JOIN public.profiles p ON tm.user_id = p.id;
```

---

## 🛠️ Table Schemas & Constraints

### 1. `public.users`
*   `id` UUID PRIMARY KEY REFERENCES `auth.users(id)`
*   `email` TEXT UNIQUE NOT NULL
*   `role` TEXT NOT NULL DEFAULT 'participant' (CHECK `role IN ('participant', 'admin')`)

### 2. `public.profiles`
*   `id` UUID PRIMARY KEY REFERENCES `auth.users(id)`
*   `full_name` TEXT NOT NULL
*   `phone` TEXT
*   `university` TEXT
*   `student_id` TEXT
*   `tshirt_size` TEXT
*   `profile_complete` BOOLEAN DEFAULT FALSE

### 3. `public.team_members`
*   `id` UUID PRIMARY KEY
*   `team_id` UUID NOT NULL REFERENCES `public.teams(id)`
*   `user_id` UUID REFERENCES `public.users(id)` (Nullable for offline invites)
*   `role` TEXT CHECK `role IN ('leader', 'member')`
*   `invitation_status` TEXT CHECK `invitation_status IN ('pending', 'accepted', 'rejected')`

---

## ⚙️ Triggers and Functions

### User Onboarding Synchronization
Automates user creation on auth signup.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'participant')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, user_id, full_name)
  VALUES (new.id, new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔒 Row-Level Security (RLS) Policies

All tables have RLS enabled. Examples of critical policies:

### `public.team_members`
*   **Select Policy:** Anyone can read team members to verify lineups (`USING (true)`).
*   **Edit Policy:** Users can edit their own team invitations (`USING (auth.uid() = user_id)`).
*   **Leader Management:** Team leaders can add or remove members:
    ```sql
    USING (
      EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = team_id AND leader_id = auth.uid()
      )
    );
    ```
