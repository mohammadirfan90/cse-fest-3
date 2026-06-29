import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RawMember {
  member_id: string;
  team_id: string;
  user_id: string | null;
  role: string;
  invitation_status: string;
  joined_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  university: string | null;
  tshirt_size: string | null;
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

    // 4. Query all teams, their competitions, and payments
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
        )
      `)
      .order("created_at", { ascending: false });

    if (teamsError) throw teamsError;

    // 4b. Fetch all team members using the coalescing view v_team_members
    const teamIds = (teams ?? []).map((t) => t.id);
    const { data: membersList, error: membersError } = await supabase
      .from("v_team_members")
      .select("member_id, team_id, user_id, role, invitation_status, joined_at, full_name, email, phone, university, tshirt_size")
      .in("team_id", teamIds);

    if (membersError) throw membersError;

    // 5. Structure and simplify the response data
    const registrations = (teams ?? []).map((t) => {
      // Find members for this team from the coalesced view results
      const teamMembers = (membersList as unknown as RawMember[] || []).filter((m) => m.team_id === t.id);
      
      const members = teamMembers.map((m) => {
        return {
          id: m.member_id,
          userId: m.user_id,
          name: m.full_name || "N/A",
          email: m.email || "N/A",
          phone: m.phone || "N/A",
          university: m.university || "N/A",
          tshirtSize: m.tshirt_size || "N/A",
          role: m.role as "leader" | "member",
          invitationStatus: m.invitation_status,
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
