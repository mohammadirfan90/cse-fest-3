import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60; // Cache for 60 seconds

interface CompetitionDb {
  id: string;
  name: string;
  type: string;
  description: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  eligibility: string;
  solo_allowed: boolean;
  team_allowed: boolean;
  min_members: number;
  max_members: number;
  registration_start: string;
  registration_end: string;
  submission_start: string;
  submission_end: string;
  entry_fee: number;
  payment_instructions: string | null;
  submission_required: boolean;
  template_link: string | null;
  rulebook_url: string | null;
  judging_criteria: unknown;
  finalist_limit: number;
  prize_pool: string | null;
  champion_prize: string | null;
  runner_up_prize: string | null;
  second_runner_up: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  show_in_hero: boolean | null;
  short_name: string | null;
  hero_capacity: number | null;
}

function mapCompetition(c: CompetitionDb) {
  const min = c.min_members || 1;
  const max = c.max_members || 1;
  const teamSizeStr = min === max 
    ? `${min} Member${min > 1 ? "s" : ""}` 
    : `${min}–${max} Members`;

  const feeStr = Number(c.entry_fee) === 0 ? "Free" : `${c.entry_fee} BDT`;
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    description: c.description || "",
    shortDescription: c.short_description || "",
    coverImageUrl: c.cover_image_url || "",
    bannerImageUrl: c.banner_image_url || "",
    eligibility: c.eligibility,
    soloAllowed: c.solo_allowed,
    teamAllowed: c.team_allowed,
    minMembers: min,
    maxMembers: max,
    teamSize: teamSizeStr,
    entryFee: Number(c.entry_fee),
    fee: feeStr,
    paymentInstructions: c.payment_instructions || "",
    submissionRequired: c.submission_required,
    templateLink: c.template_link || "",
    rulebookUrl: c.rulebook_url || "",
    judgingCriteria: c.judging_criteria,
    finalistLimit: c.finalist_limit,
    prizePool: c.prize_pool || "TBD",
    championPrize: c.champion_prize || "TBD",
    runnerUpPrize: c.runner_up_prize || "TBD",
    secondRunnerUp: c.second_runner_up || "TBD",
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    showInHero: c.show_in_hero ?? false,
    shortName: c.short_name || "",
    heroCapacity: c.hero_capacity ?? 80,
    registrationStart: c.registration_start,
    registrationEnd: c.registration_end,
    // Add camelCase fallback names to make transitions 100% safe
    short_description: c.short_description || "",
    prize_pool: c.prize_pool || "TBD",
    champion_prize: c.champion_prize || "TBD",
    runner_up_prize: c.runner_up_prize || "TBD",
    second_runner_up: c.second_runner_up || "TBD",
    entry_fee: Number(c.entry_fee),
    show_in_hero: c.show_in_hero ?? false,
    short_name: c.short_name || "",
    hero_capacity: c.hero_capacity ?? 80,
    registration_start: c.registration_start,
    registration_end: c.registration_end,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const supabase = await createClient();

    if (id) {
      // Fetch single competition details
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", id)
        .neq("status", "draft") // Don't show drafts to public
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, message: "Competition not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: mapCompetition(data as CompetitionDb),
      });
    }

    // Fetch list of active/published competitions
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mappedData = (data as CompetitionDb[] || []).map(mapCompetition);

    return NextResponse.json({
      success: true,
      data: mappedData,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load competitions.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
