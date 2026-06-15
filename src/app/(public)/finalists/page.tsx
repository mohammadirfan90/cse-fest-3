"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  AlertCircle,
  Clock,
  ChevronLeft,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface CompetitionItem {
  id: string;
  name: string;
  type: string;
  preliminary_published: boolean;
  final_published: boolean;
}

interface LeaderboardItem {
  id: string;
  total_score: number;
  rank_position: number;
  is_finalist: boolean;
  teams: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function PublicFinalistsPage() {
  const [competitions, setCompetitions] = React.useState<CompetitionItem[]>([]);
  const [selectedCompId, setSelectedCompId] = React.useState<string>("");
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const supabase = createClient();

  // Load published competitions on mount
  React.useEffect(() => {
    async function loadCompetitions() {
      try {
        setLoading(true);
        setErrorMsg(null);
        // Load active and published competitions
        const { data, error } = await supabase
          .from("competitions")
          .select("id, name, type, preliminary_published, final_published")
          .neq("status", "draft")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCompetitions((data || []) as unknown as CompetitionItem[]);
        if (data && data.length > 0) {
          setSelectedCompId(data[0].id);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load competitions.";
        setErrorMsg(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    loadCompetitions();
  }, [supabase]);

  // Load public leaderboard rankings for selected competition
  React.useEffect(() => {
    let active = true;
    async function loadLeaderboard() {
      if (!selectedCompId) return;

      const activeComp = competitions.find((c) => c.id === selectedCompId);
      const isPublished = activeComp?.preliminary_published || activeComp?.final_published;

      if (!isPublished) {
        if (active) setLeaderboard([]);
        return;
      }

      setDataLoading(true);
      setErrorMsg(null);
      try {
        // Query rankings where is_public is true (enforced by RLS)
        const { data, error } = await supabase
          .from("rankings")
          .select("id, total_score, rank_position, is_finalist, teams(id, name, status)")
          .eq("competition_id", selectedCompId)
          .order("rank_position", { ascending: true });

        if (error) throw error;

        if (active) {
          // Filter out teams that are rejected
          const filtered = ((data || []) as unknown as LeaderboardItem[]).filter(
            (item) => item.teams && item.teams.status !== "rejected"
          );
          setLeaderboard(filtered);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load leaderboard.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setDataLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, [selectedCompId, competitions, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-neutral-500">Retrieving official finalists...</p>
      </div>
    );
  }

  const activeComp = competitions.find((c) => c.id === selectedCompId);
  const publishPhase = activeComp?.final_published
    ? "final"
    : activeComp?.preliminary_published
    ? "preliminary"
    : "unpublished";

  // Filtered lists based on publishing stage
  const preliminaryList = leaderboard.filter((l) => l.teams?.status === "selected");
  const finalistsList = leaderboard.filter((l) => l.is_finalist);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16">
      {/* Top Navbar Back Coordinate link */}
      <header className="h-16 border-b border-neutral-900 bg-neutral-950/40 backdrop-blur-md sticky top-0 flex items-center px-6 justify-between z-40">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors font-sans">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <span className="font-heading font-bold text-sm tracking-wider text-neutral-50">
            CSE FEST 2026
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 pt-12 space-y-12 animate-fade-in">
        {/* Title Block */}
        <div className="text-center space-y-3">
          <Badge variant="accent" className="font-mono">
            Official Announcements
          </Badge>
          <h1 className="text-h2 font-heading font-bold text-neutral-50 tracking-tight">
            {publishPhase === "final"
              ? "Onsite Teams — Final Confirmed"
              : publishPhase === "preliminary"
              ? "Onsite Teams — Preliminary Selection"
              : "Finalists & Standings"}
          </h1>
          <p className="text-sm text-neutral-400 font-sans max-w-lg mx-auto">
            {publishPhase === "final"
              ? "The verified finalist teams confirmed to compete onsite at CSE Fest 2026."
              : publishPhase === "preliminary"
              ? "Teams selected in the preliminary round. Please complete payment registration to confirm your spot."
              : "Explore standings, criteria grades, and selected finalist teams representing their universities."}
          </p>
        </div>

        {/* Phase Banners */}
        {publishPhase === "preliminary" && (
          <div className="p-3 text-center bg-warning/10 border border-warning/20 text-warning rounded-lg text-xs font-sans font-medium max-w-2xl mx-auto">
            ⚡ Preliminary Selection Announced — Final confirmation pending payment verification.
          </div>
        )}
        {publishPhase === "final" && (
          <div className="p-4 text-center bg-success/10 border border-success/20 text-success rounded-lg text-xs font-sans font-semibold max-w-2xl mx-auto">
            🎉 Congratulations to all confirmed finalists! See you onsite at CSE Fest 2026.
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-sm bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2 max-w-xl mx-auto">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {competitions.length > 0 ? (
          <div className="space-y-8">
            {/* Competition Tabs selection */}
            <div className="flex flex-wrap gap-2 justify-center border-b border-neutral-900 pb-4">
              {competitions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompId(c.id)}
                  className={`py-2.5 px-4 rounded-sm text-xs font-semibold tracking-wide font-sans transition-all border outline-none ${
                    selectedCompId === c.id
                      ? "bg-accent/15 border-accent text-accent"
                      : "bg-neutral-900 border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:border-neutral-800"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Leaderboard content */}
            {dataLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-neutral-900 w-full rounded-md" />
                <div className="h-40 bg-neutral-900 w-full rounded-md" />
              </div>
            ) : publishPhase === "preliminary" ? (
              // PRELIMINARY VIEW
              <div className="space-y-6">
                <h2 className="text-sm font-heading font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning fill-warning animate-pulse" />
                  <span>Selected Contenders</span>
                </h2>
                {preliminaryList.length > 0 ? (
                  <Card variant="default">
                    <CardContent className="p-0">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-neutral-850 bg-neutral-900/30 text-neutral-400 font-semibold tracking-wide uppercase">
                            <th className="py-3.5 px-6">Team Name</th>
                            <th className="py-3.5 px-6 text-right">Selection Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-y-neutral-850/50">
                          {preliminaryList.map((item) => (
                            <tr key={item.id} className="hover:bg-neutral-900/20">
                              <td className="py-4 px-6 font-semibold text-neutral-100">
                                {item.teams?.name}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <Badge variant="warning" className="capitalize">Selected</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-10 text-center border border-neutral-900 rounded bg-neutral-950/20 text-neutral-500">
                    No preliminary teams found.
                  </div>
                )}
                <p className="text-center text-xxs text-neutral-500 font-sans mt-4">
                  * Final selection spot confirmations are subject to entry fee verification.
                </p>
              </div>
            ) : publishPhase === "final" ? (
              // FINAL VIEW
              <div className="space-y-8">
                {/* 1. Finalists Spotlight Card */}
                {finalistsList.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-heading font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                      <Star className="h-4 w-4 text-accent fill-accent animate-pulse" />
                      <span>Selected Finalists Spotlight</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {finalistsList.map((f) => (
                        <Card
                          key={f.id}
                          variant="default"
                          className="border-success/20 bg-success/5 hover:scale-[1.01] hover:border-success/30 transition-all p-5 flex items-center justify-between"
                        >
                          <div className="space-y-1.5 min-w-0 pr-2">
                            <Badge variant="success" className="text-xxs px-2 py-0.5">
                              Rank #{f.rank_position}
                            </Badge>
                            <h3 className="font-heading font-bold text-neutral-100 text-base truncate">
                              {f.teams?.name}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1 text-right">
                            <span className="text-xxs text-neutral-500 font-sans">Verification</span>
                            <Badge variant="success">Confirmed</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Full Leaderboard rankings list */}
                <div className="space-y-4">
                  <h2 className="text-sm font-heading font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span>Complete Standings</span>
                  </h2>
                  <Card variant="default">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                          <thead>
                            <tr className="border-b border-neutral-850 bg-neutral-900/30 text-neutral-400 font-semibold tracking-wide uppercase">
                              <th className="py-3.5 px-4 font-mono w-16">Rank</th>
                              <th className="py-3.5 px-4">Team Name</th>
                              <th className="py-3.5 px-4 text-right">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-y-neutral-850/50">
                            {leaderboard.map((item) => (
                              <tr
                                key={item.id}
                                className={`transition-colors ${
                                  item.is_finalist
                                    ? "bg-success/5 hover:bg-success/10"
                                    : "hover:bg-neutral-900/20"
                                }`}
                              >
                                <td className="py-4 px-4 font-mono font-bold text-accent text-sm">
                                  #{item.rank_position}
                                </td>
                                <td className="py-4 px-4 font-semibold text-neutral-100">
                                  {item.teams?.name}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {item.is_finalist ? (
                                    <Badge variant="success">Finalist</Badge>
                                  ) : (
                                    <Badge variant="neutral">Contender</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* Not Published / Under Review State */
              <Card variant="default" className="text-center p-12 bg-neutral-900/20 max-w-xl mx-auto border-neutral-850 space-y-4">
                <Clock className="h-10 w-10 text-neutral-700 animate-pulse mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-heading font-semibold text-sm text-neutral-300">
                    Standings Under Review
                  </h3>
                  <p className="text-xs text-neutral-500 font-sans max-w-sm mx-auto leading-relaxed">
                    Organizers are currently evaluating submissions and calculating scores for this competition. Results will be published here shortly.
                  </p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center text-neutral-500 py-12">
            No competitions active. Check back later.
          </div>
        )}
      </main>
    </div>
  );
}
