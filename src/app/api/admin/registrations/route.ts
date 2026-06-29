import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RawMember {
  id: string;
  user_id: string | null;
  role: "leader" | "member";
  invitation_status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  university: string | null;
  joined_at: string;
  users: {
    email: string;
    profiles: {
      full_name: string | null;
      phone: string | null;
      university: string | null;
      tshirt_size: string | null;
    } | null;
  } | null;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Authorize admin
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userRecord || (userRecord.role !== "admin" && userRecord.role !== "coordinator")) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Authorized access only." },
        { status: 403 }
      );
    }

    // 3. Query competitions for tabs and dropdowns
    const { data: competitions, error: compError } = await supabase
      .from("competitions")
      .select("id, name, type")
      .order("name", { ascending: true });

    if (compError) throw compError;

    // 4. Query all teams, their competitions, payments, and members
    // We join team_members, users, and profiles to get full profiles of leaders and members
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        status,
        competition_id,
        leader_id,
        created_at,
        competitions (
          name,
          type
        ),
        payments (
          amount,
          method,
          transaction_id,
          status
        ),
        team_members (
          id,
          user_id,
          role,
          invitation_status,
          full_name,
          email,
          phone,
          university,
          joined_at,
          users!team_members_user_id_fkey (
            email,
            profiles (
              full_name,
              phone,
              university,
              tshirt_size
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (teamsError) throw teamsError;

    // 5. Structure and simplify the response data
    const registrations = (teams ?? []).map((t) => {
      // Find team members
      const rawMembers = (t.team_members as unknown as RawMember[]) ?? [];
      
      // Map members, merging team_members data with fallback to user profiles
      const members = rawMembers.map((m) => {
        const userObj = m.users;
        const profileObj = userObj?.profiles;

        const name = m.full_name || profileObj?.full_name || "N/A";
        const email = m.email || userObj?.email || "N/A";
        const phone = m.phone || profileObj?.phone || "N/A";
        const university = m.university || profileObj?.university || "N/A";
        const tshirtSize = profileObj?.tshirt_size || "N/A";

        return {
          id: m.id,
          userId: m.user_id,
          name,
          email,
          phone,
          university,
          tshirtSize,
          role: m.role, // "leader" or "member"
          invitationStatus: m.invitation_status, // "accepted", "pending", etc.
        };
      });

      // Find primary leader
      const leader = members.find((m) => m.role === "leader") || 
                     members.find((m) => m.userId === t.leader_id) || 
                     null;

      // Extract payment details (there might be multiple, but we show the latest/active one)
      const latestPayment = t.payments && t.payments.length > 0 
        ? t.payments[t.payments.length - 1] 
        : null;

      const payment = latestPayment ? {
        amount: latestPayment.amount,
        method: latestPayment.method,
        transactionId: latestPayment.transaction_id,
        status: latestPayment.status, // "pending", "approved", "rejected", "resubmission_required"
      } : null;

      const comp = t.competitions as { name: string; type: string } | { name: string; type: string }[] | null;
      const compName = (Array.isArray(comp) ? comp[0]?.name : comp?.name) || "N/A";
      const compType = (Array.isArray(comp) ? comp[0]?.type : comp?.type) || "N/A";

      return {
        id: t.id,
        name: t.name,
        status: t.status,
        competitionId: t.competition_id,
        competitionName: compName,
        competitionType: compType,
        createdAt: t.created_at,
        leader,
        members,
        payment,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        competitions: competitions ?? [],
        registrations,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load registrations.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
