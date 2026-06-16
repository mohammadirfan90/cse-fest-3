import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CompetitionItem {
  id: string;
  name: string;
}

interface TeamItem {
  competition_id: string;
}

interface ProfileItem {
  created_at: string;
  university: string | null;
  profile_complete: boolean;
}

interface PaymentItem {
  method: string;
  amount: number;
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

    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin only." },
        { status: 403 }
      );
    }

    // 3. Fetch raw data for in-memory aggregation
    // Fetch all profiles for registration trends and university stats
    const { data: rawProfiles, error: profileErr } = await supabase
      .from("profiles")
      .select("created_at, university, profile_complete");

    if (profileErr) throw profileErr;

    // Fetch all competitions
    const { data: rawCompetitions, error: compErr } = await supabase
      .from("competitions")
      .select("id, name");

    if (compErr) throw compErr;

    // Fetch all teams
    const { data: rawTeams, error: teamErr } = await supabase
      .from("teams")
      .select("competition_id");

    if (teamErr) throw teamErr;

    // Fetch approved payments
    const { data: rawPayments, error: payErr } = await supabase
      .from("payments")
      .select("method, amount")
      .eq("status", "approved");

    if (payErr) throw payErr;

    // 4. In-Memory Aggregations
    // A. Registration trends (last 15 days)
    const registrationTrendsMap: Record<string, number> = {};
    const profiles = (rawProfiles || []) as ProfileItem[];
    
    // Pre-populate last 15 days with 0s
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      registrationTrendsMap[dateStr] = 0;
    }

    profiles.forEach((p) => {
      const dateStr = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dateStr in registrationTrendsMap) {
        registrationTrendsMap[dateStr]++;
      }
    });

    const registrationTrends = Object.entries(registrationTrendsMap).map(([date, count]) => ({
      date,
      count,
    }));

    // B. Competition Shares (number of teams per competition)
    const competitions = (rawCompetitions || []) as CompetitionItem[];
    const teams = (rawTeams || []) as TeamItem[];
    
    const competitionShares = competitions.map((c) => {
      const count = teams.filter((t) => t.competition_id === c.id).length;
      return {
        name: c.name,
        teamsCount: count,
      };
    });

    // C. University Stats (Top 5 participating universities)
    const universityMap: Record<string, number> = {};
    profiles.forEach((p) => {
      const uni = p.university?.trim() || "Unknown";
      universityMap[uni] = (universityMap[uni] || 0) + 1;
    });

    const universityStats = Object.entries(universityMap)
      .map(([university, count]) => ({
        university,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // D. Payment Collections by gateway (bkash vs nagad)
    const payments = (rawPayments || []) as unknown as PaymentItem[];
    const paymentsMap: Record<string, number> = { bkash: 0, nagad: 0 };
    
    payments.forEach((p) => {
      const m = p.method.toLowerCase();
      if (m in paymentsMap) {
        paymentsMap[m] += Number(p.amount);
      }
    });

    const paymentCollections = Object.entries(paymentsMap).map(([method, total]) => ({
      method: method === "bkash" ? "bKash" : "Nagad",
      total,
    }));

    // E. General averages/summary metrics
    const totalRevenue = Object.values(paymentsMap).reduce((a, b) => a + b, 0);
    const averageTeamsPerComp = competitions.length > 0 ? (teams.length / competitions.length) : 0;
    const profileCompleteRatio = profiles.length > 0 
      ? Math.round((profiles.filter((p) => p.profile_complete).length / profiles.length) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        registrationTrends,
        competitionShares,
        universityStats,
        paymentCollections,
        summary: {
          totalRevenue,
          averageTeamsPerComp: Math.round(averageTeamsPerComp * 10) / 10,
          profileCompleteRatio,
        },
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to generate analytics.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
