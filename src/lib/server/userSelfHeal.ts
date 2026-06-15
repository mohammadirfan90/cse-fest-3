import { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Self-healing helper to ensure that a corresponding row exists in both
 * `public.users` and `public.profiles` for an authenticated auth user.
 * This prevents foreign key constraint violation errors when triggers fail to fire
 * or during local development where auth users are created out of sync.
 */
export async function ensureUserAndProfileExists(supabase: SupabaseClient, user: User): Promise<void> {
  try {
    // 1. Ensure user row exists in public.users
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      console.error("[Self-Heal] Error reading public.users:", userError.message);
    }

    if (!userRecord) {
      console.log(`[Self-Heal] Inserting user row for auth ID ${user.id}`);
      const { error: insertUserError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email || "",
          role: "participant",
        });

      if (insertUserError) {
        console.error("[Self-Heal] Error inserting public.users:", insertUserError.message);
      }
    }

    // 2. Ensure profile row exists in public.profiles
    const { data: profileRecord, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[Self-Heal] Error reading public.profiles:", profileError.message);
    }

    if (!profileRecord) {
      console.log(`[Self-Heal] Inserting profile row for user ID ${user.id}`);
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const { error: insertProfileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          user_id: user.id,
          full_name: fullName,
          verification_status: "incomplete",
        });

      if (insertProfileError) {
        console.error("[Self-Heal] Error inserting public.profiles:", insertProfileError.message);
      }
    }
  } catch (err) {
    console.error("[Self-Heal] Unexpected error during check:", err);
  }
}
