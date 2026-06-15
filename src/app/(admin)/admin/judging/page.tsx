"use client";

import * as React from "react";
import {
  Check,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface CompetitionItem {
  id: string;
  name: string;
  type: string;
  judging_criteria: Array<{ name: string; weight: number }>;
  finalist_limit: number;
  preliminary_published: boolean;
  final_published: boolean;
}

interface TeamItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
  submission: {
    title: string;
    submitted_at: string;
  } | null;
  total_score: number;
  rank_position: number | null;
  is_finalist: boolean;
  is_public: boolean;
}

export default function AdminJudgingPage() {
  const [competitions, setCompetitions] = React.useState<CompetitionItem[]>([]);
  const [selectedCompId, setSelectedCompId] = React.useState<string>("");
  const [teams, setTeams] = React.useState<TeamItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Messages
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Inline scoring state
  const [inlineScores, setInlineScores] = React.useState<Record<string, number>>({});
  const [savingScoreId, setSavingScoreId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"evaluation" | "preselection">("evaluation");

  // Filtered lists
  const evaluationTeams = teams.filter(
    (t) => t.status === "judging_ready" || t.status === "selected" || t.status === "finalist"
  );
  const preSelectionTeams = teams.filter(
    (t) => t.status === "submitted" && t.submission !== null
  );

  // Publishing State
  const [finalistTeamIds, setFinalistTeamIds] = React.useState<string[]>([]);
  const [publishing, setPublishing] = React.useState(false);

  const supabase = createClient();

  // Load competitions on mount
  React.useEffect(() => {
    async function loadCompetitions() {
      try {
        setLoading(true);
        setErrorMsg(null);
        // Load active and published competitions
        const { data, error } = await supabase
          .from("competitions")
          .select("id, name, type, judging_criteria, finalist_limit, preliminary_published, final_published")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCompetitions(data || []);
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

  // Load team scores & rankings for selected competition
  React.useEffect(() => {
    let active = true;
    async function loadJudgingData() {
      if (!selectedCompId) return;

      setDataLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/admin/judging?competition_id=${selectedCompId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        if (active) {
          const compTeams = data.data.teams || [];
          setTeams(compTeams);

          // Populate finalists from current active states
          const currentFinalists = compTeams
            .filter((t: TeamItem) => t.is_finalist)
            .map((t: TeamItem) => t.id);
          setFinalistTeamIds(currentFinalists);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load scoring data.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setDataLoading(false);
        }
      }
    }

    loadJudgingData();

    return () => {
      active = false;
    };
  }, [selectedCompId, refreshTrigger]);

  // Save inline score submission
  const handleSaveInlineScore = async (teamId: string) => {
    setSavingScoreId(teamId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const score = inlineScores[teamId] !== undefined
        ? inlineScores[teamId]
        : (teams.find((t) => t.id === teamId)?.total_score ?? 0);

      const res = await fetch("/api/admin/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          competition_id: selectedCompId,
          score: score,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record team score.";
      setErrorMsg(errorMessage);
    } finally {
      setSavingScoreId(null);
    }
  };

  // Toggle finalist checkboxes
  const handleFinalistToggle = (teamId: string) => {
    setFinalistTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  // Publish preliminary results
  const handlePublishPreliminary = async () => {
    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/judging/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: selectedCompId,
          publish_type: "preliminary",
          finalist_team_ids: finalistTeamIds,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);

      // Reload competitions to refresh publish states
      const { data: updatedComps } = await supabase
        .from("competitions")
        .select("id, name, type, judging_criteria, finalist_limit, preliminary_published, final_published")
        .order("created_at", { ascending: false });
      if (updatedComps) {
        setCompetitions(updatedComps || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish preliminary rankings.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  // Publish final selection
  const handlePublishFinal = async () => {
    if (!activeComp?.preliminary_published) {
      setErrorMsg("You must publish preliminary results first.");
      return;
    }
    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/judging/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: selectedCompId,
          publish_type: "final",
          finalist_team_ids: finalistTeamIds,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);

      // Reload competitions to refresh publish states
      const { data: updatedComps } = await supabase
        .from("competitions")
        .select("id, name, type, judging_criteria, finalist_limit, preliminary_published, final_published")
        .order("created_at", { ascending: false });
      if (updatedComps) {
        setCompetitions(updatedComps || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish final selection.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-neutral-900 w-1/3 rounded-sm" />
        <div className="h-24 bg-neutral-900 w-full rounded-md" />
        <div className="h-64 bg-neutral-900 w-full rounded-md" />
      </div>
    );
  }

  const activeComp = competitions.find((c) => c.id === selectedCompId);
  const isLeaderboardPublic = teams.length > 0 && teams[0]?.is_public;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-h3 font-heading font-bold text-neutral-50 tracking-tight">Evaluation & Rankings</h1>
        <p className="text-sm text-neutral-400 font-sans mt-1">
          Input weighted criteria scores, view auto-calculated leaderboard ranks, and publish final finalists.
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2.5">
          <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {competitions.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Main Scoring Grid */}
          <div className="xl:col-span-2 space-y-6">
            {/* Selection Card */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-sans">
                    Select Competition Dashboard
                  </label>
                  <select
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                    className="flex h-11 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700 transition-all duration-150 outline-none font-sans cursor-pointer"
                  >
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Teams Grading Queue */}
            <Card variant="glass" className="bg-glass border-glass p-0 overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center p-6 pb-4 border-b border-neutral-800 bg-neutral-900/10">
                <CardTitle className="text-md font-heading font-semibold text-neutral-100">Teams Evaluation Ledger</CardTitle>
                <Badge variant={activeComp?.final_published ? "success" : activeComp?.preliminary_published ? "warning" : "neutral"} className="flex gap-1.5 items-center font-mono">
                  {activeComp?.final_published ? (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Final Published</span>
                    </>
                  ) : activeComp?.preliminary_published ? (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Preliminary Published</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      <span>Leaderboard Hidden</span>
                    </>
                  )}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex border-b border-neutral-800 px-6 bg-neutral-900/5">
                  <button
                    onClick={() => setActiveTab("evaluation")}
                    className={`py-3 text-xs font-semibold font-sans tracking-wide transition-all border-b-2 outline-none mr-6 cursor-pointer ${
                      activeTab === "evaluation"
                        ? "border-accent text-accent"
                        : "border-transparent text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    Evaluation Queue ({evaluationTeams.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("preselection")}
                    className={`py-3 text-xs font-semibold font-sans tracking-wide transition-all border-b-2 outline-none cursor-pointer ${
                      activeTab === "preselection"
                        ? "border-accent text-accent"
                        : "border-transparent text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    Pre-Selection Submissions ({preSelectionTeams.length})
                  </button>
                </div>

                {dataLoading ? (
                  <div className="p-12 space-y-4 animate-pulse">
                    {[...Array(3)].map((_, idx) => (
                      <div key={idx} className="h-10 bg-neutral-900/40 w-full rounded-lg border border-neutral-850" />
                    ))}
                  </div>
                ) : (activeTab === "evaluation" ? evaluationTeams : preSelectionTeams).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold tracking-wider uppercase text-xxs">
                          <th className="py-4 px-6 font-mono w-16 text-center">Rank</th>
                          <th className="py-4 px-6">Team Name</th>
                          <th className="py-4 px-6">Phase State</th>
                          <th className="py-4 px-6">Total Score</th>
                          <th className="py-4 px-6 text-right">Score (0–100)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850/30">
                        {(activeTab === "evaluation" ? evaluationTeams : preSelectionTeams).map((t) => (
                          <tr key={t.id} className="hover:bg-neutral-900/20 transition-colors">
                            <td className="py-4 px-6 text-center font-mono font-bold text-neutral-350 text-sm">
                              {t.rank_position ? `#${t.rank_position}` : "—"}
                            </td>
                            <td className="py-4 px-6 font-medium text-neutral-100">
                              <div className="space-y-1">
                                <div className="font-semibold text-sm">{t.name}</div>
                                {t.submission && (
                                  <div className="text-neutral-500 text-xxs font-normal font-mono">
                                    Docs: {t.submission.title}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <Badge
                                variant={
                                  t.status === "finalist" || t.status === "selected"
                                    ? "success"
                                    : t.status === "rejected"
                                    ? "error"
                                    : t.status === "forming"
                                    ? "warning"
                                    : t.status === "submitted" || t.status === "registered"
                                    ? "primary"
                                    : "neutral"
                                }
                                className="capitalize"
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-sm text-neutral-200">
                              {t.total_score} pts
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={inlineScores[t.id] ?? t.total_score}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setInlineScores((prev) => ({
                                      ...prev,
                                      [t.id]: isNaN(val) ? 0 : val,
                                    }));
                                  }}
                                  className="w-20 h-8 text-xs font-mono text-right"
                                  disabled={savingScoreId === t.id}
                                />
                                <Button
                                  variant="primary"
                                  onClick={() => handleSaveInlineScore(t.id)}
                                  isLoading={savingScoreId === t.id}
                                  disabled={savingScoreId === t.id}
                                  className="h-8 text-xxs font-semibold px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
                                >
                                  Save
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-16 text-center text-neutral-500 font-sans leading-relaxed">
                    {activeTab === "evaluation"
                      ? "No teams ready for evaluation in this competition yet."
                      : "No pre-selection submissions found in this competition yet."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Rankings Publish Console */}
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-semibold text-neutral-200">Leaderboard Console</h2>
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6 space-y-6 font-sans text-xs">
                {/* Competition Details summary */}
                <div className="space-y-3 pb-4 border-b border-neutral-800">
                  <h3 className="font-semibold text-neutral-300 text-sm tracking-tight">{activeComp?.name} parameters</h3>
                  <div className="text-neutral-400 space-y-2">
                    <div>Finalist limit quota: <span className="text-neutral-200 font-bold font-mono bg-neutral-950 px-2 py-1 rounded border border-neutral-850 ml-1">{activeComp?.finalist_limit || 20} teams</span></div>
                  </div>
                </div>

                {/* Finalists Checklist Selection */}
                {evaluationTeams.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-neutral-300 text-sm">Select Finalists Checklist</h4>
                      <p className="text-xxs text-neutral-500 leading-relaxed mt-0.5">
                        Choose teams to confirm as finalists. Recommended quota limit: top {activeComp?.finalist_limit}.
                      </p>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto border border-neutral-850 rounded-xl bg-neutral-950/40 p-2.5">
                      {evaluationTeams.map((t, idx) => {
                        const isChecked = finalistTeamIds.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleFinalistToggle(t.id)}
                            className={`flex items-center gap-3 p-2.5 rounded cursor-pointer transition-all duration-150 border ${
                              isChecked
                                ? "bg-neutral-900 border-neutral-750 text-neutral-100 font-bold"
                                : "border-transparent text-neutral-400 hover:bg-neutral-900/40 hover:text-neutral-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded border-neutral-750 bg-neutral-900 text-neutral-300 focus:ring-neutral-850 h-3.5 w-3.5 cursor-pointer"
                            />
                            <div className="flex-1 flex justify-between font-medium items-center min-w-0 pr-1">
                              <span className="truncate text-xs font-semibold">
                                {idx + 1}. {t.name}
                              </span>
                              <span className="font-mono text-xxs shrink-0 text-neutral-500 pl-2">
                                {t.total_score} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Publish Action buttons */}
                    <div className="pt-2 space-y-3">
                      {!activeComp?.preliminary_published ? (
                        <div className="space-y-1.5">
                          <Button
                            variant="primary"
                            onClick={handlePublishPreliminary}
                            disabled={publishing}
                            isLoading={publishing}
                            className="w-full justify-center gap-2 text-xs font-semibold py-3 active:scale-[0.99] shadow-level-2"
                          >
                            <Unlock className="h-4 w-4" />
                            <span>Publish Preliminary Results</span>
                          </Button>
                          <p className="text-[10px] text-neutral-500 text-center leading-normal">
                            This will notify selected teams to complete payment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 justify-center py-1 bg-warning/10 border border-warning/20 text-warning rounded text-[10px] font-mono">
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preliminary Selection Published</span>
                          </div>

                          {!activeComp?.final_published ? (
                            <div className="space-y-1.5">
                              <Button
                                variant="success"
                                onClick={handlePublishFinal}
                                disabled={publishing}
                                isLoading={publishing}
                                className="w-full justify-center gap-2 text-xs font-semibold py-3 active:scale-[0.99] shadow-level-2"
                              >
                                <Unlock className="h-4 w-4" />
                                <span>Publish Final Selection</span>
                              </Button>
                              <p className="text-[10px] text-neutral-500 text-center leading-normal">
                                Only publish after verifying payments.
                              </p>
                              <Button
                                variant="secondary"
                                onClick={handlePublishPreliminary}
                                disabled={publishing}
                                isLoading={publishing}
                                className="w-full justify-center text-[10px] py-1.5"
                              >
                                Update Preliminary Selection
                              </Button>
                              <p className="text-[9px] text-neutral-500 text-center leading-normal">
                                (Update selection without re-notifying)
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 justify-center py-1 bg-success/10 border border-success/20 text-success rounded text-[10px] font-mono">
                                <Eye className="h-3.5 w-3.5" />
                                <span>Final Selection Published</span>
                              </div>
                              <Button
                                variant="secondary"
                                onClick={handlePublishFinal}
                                disabled={publishing}
                                isLoading={publishing}
                                className="w-full justify-center text-xs font-semibold py-2"
                              >
                                Update Final Selection
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 py-6">
                    Enroll and approve teams to enable public consoles.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card variant="glass" className="p-12 text-center text-neutral-500 leading-relaxed bg-glass border-glass">
          No competitions created yet.
        </Card>
      )}


    </div>
  );
}

