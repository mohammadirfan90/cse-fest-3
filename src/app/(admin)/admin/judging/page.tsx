"use client";

import * as React from "react";
import {
  Check,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  HelpCircle,
  Loader2,
  Undo2,
  Info,
  ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    id: string;
    title: string;
    pdf_path: string | null;
    youtube_demo_url: string | null;
    notes: string | null;
    submitted_at: string;
  } | null;
  total_score: number;
  rank_position: number | null;
  is_finalist: boolean;
  is_public: boolean;
}

export default function AdminResultControlPage() {
  const [competitions, setCompetitions] = React.useState<CompetitionItem[]>([]);
  const [selectedCompId, setSelectedCompId] = React.useState<string>("");
  const [teams, setTeams] = React.useState<TeamItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Messages
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Checked checkboxes state
  const [checkedTeamIds, setCheckedTeamIds] = React.useState<string[]>([]);
  
  // Submit actions states
  const [submittingAction, setSubmittingAction] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const supabase = createClient();

  // Load competitions on mount
  React.useEffect(() => {
    async function loadCompetitions() {
      try {
        setLoading(true);
        setErrorMsg(null);
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

  // Load team list for selected competition
  React.useEffect(() => {
    let active = true;
    async function loadTeamsData() {
      if (!selectedCompId) return;

      setDataLoading(true);
      setErrorMsg(null);
      setCheckedTeamIds([]);
      try {
        const res = await fetch(`/api/admin/judging?competition_id=${selectedCompId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        if (active) {
          const compTeams = data.data.teams || [];
          setTeams(compTeams);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load teams data.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setDataLoading(false);
        }
      }
    }

    loadTeamsData();

    return () => {
      active = false;
    };
  }, [selectedCompId, refreshTrigger]);

  // Single status update handler
  const handleUpdateStatus = async (teamId: string, newStatus: string) => {
    setSubmittingAction(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(`Team status updated to "${newStatus}" successfully.`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update team status.";
      setErrorMsg(errorMessage);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Bulk status update handler
  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (checkedTeamIds.length === 0) return;
    setSubmittingAction(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_ids: checkedTeamIds,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(`Successfully updated ${checkedTeamIds.length} teams to status "${newStatus}".`);
      setCheckedTeamIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update team statuses.";
      setErrorMsg(errorMessage);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Publish preliminary selection
  const handlePublishPreliminary = async () => {
    const selectedIds = teams.filter((t) => t.status === "selected").map((t) => t.id);
    if (selectedIds.length === 0) {
      setErrorMsg("No teams are currently in the 'selected' status. Select at least one team first.");
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
          publish_type: "preliminary",
          finalist_team_ids: selectedIds,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish preliminary results.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish preliminary selection
  const handleUnpublishPreliminary = async () => {
    if (!confirm("Are you sure you want to unpublish preliminary selection? This will reset all selected/waiting/rejected/finalist teams back to submitted/registered states.")) return;
    
    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/judging/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: selectedCompId,
          publish_type: "unpublish_preliminary",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unpublish preliminary results.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  // Publish final selection
  const handlePublishFinal = async () => {
    const finalistIds = teams.filter((t) => t.status === "finalist").map((t) => t.id);
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
          finalist_team_ids: finalistIds,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to publish final selection.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish final selection
  const handleUnpublishFinal = async () => {
    if (!confirm("Are you sure you want to unpublish final results? This will clear final selection tags and hide the final leaderboard.")) return;
    
    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/judging/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: selectedCompId,
          publish_type: "unpublish_final",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unpublish final selection.";
      setErrorMsg(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  // Toggle single team checked state
  const handleTeamCheckToggle = (teamId: string) => {
    setCheckedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  // Toggle select all teams checked state
  const handleSelectAllToggle = () => {
    if (checkedTeamIds.length === teams.length) {
      setCheckedTeamIds([]);
    } else {
      setCheckedTeamIds(teams.map((t) => t.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "forming":
        return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">Forming</Badge>;
      case "registered":
      case "submitted":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Registered</Badge>;
      case "selected":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold font-mono">Selected</Badge>;
      case "rejected":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Rejected</Badge>;
      case "waiting":
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Waitlist</Badge>;
      case "finalist":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">Finalist</Badge>;
      default:
        return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">{status}</Badge>;
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
  const selectedCount = teams.filter((t) => t.status === "selected").length;
  const waitlistCount = teams.filter((t) => t.status === "waiting").length;
  const rejectedCount = teams.filter((t) => t.status === "rejected").length;
  const finalistCount = teams.filter((t) => t.status === "finalist").length;

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-50 tracking-tight flex items-center gap-2">
          <span>Result Control Panel</span>
        </h1>
        <p className="text-sm text-neutral-400 font-sans mt-1">
          Perform team evaluations, assign selection/rejection/waitlist status, and trigger segment-wise result publications.
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-medium flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-medium flex items-start gap-2.5">
          <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {competitions.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Main Controls Grid */}
          <div className="xl:col-span-2 space-y-6">
            {/* Selection Card */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Select Competition Segment
                  </label>
                  <select
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                    className="flex h-11 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700 transition-all duration-150 outline-none cursor-pointer"
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

            {/* Teams Ledger */}
            <Card variant="glass" className="bg-glass border-glass p-0 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 pb-4 border-b border-neutral-800 bg-neutral-900/10 gap-4">
                <div>
                  <CardTitle className="text-md font-heading font-semibold text-neutral-100">Teams Ledger</CardTitle>
                </div>
                <Badge
                  variant={
                    activeComp?.final_published
                      ? "success"
                      : activeComp?.preliminary_published
                      ? "warning"
                      : "neutral"
                  }
                  className="flex gap-1.5 items-center font-mono py-1 px-3"
                >
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
                      <span>Results Hidden</span>
                    </>
                  )}
                </Badge>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* Bulk Action Bar (Shows when checkboxes are selected) */}
                {checkedTeamIds.length > 0 && (
                  <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3 flex items-center justify-between gap-4 animate-fade-in">
                    <span className="text-xs font-mono font-bold text-neutral-350">
                      {checkedTeamIds.length} team{checkedTeamIds.length !== 1 ? "s" : ""} checked
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleBulkUpdateStatus("selected")}
                        disabled={submittingAction}
                        className="h-8 text-xxs font-semibold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer rounded"
                      >
                        Bulk Select
                      </Button>
                      <Button
                        onClick={() => handleBulkUpdateStatus("waiting")}
                        disabled={submittingAction}
                        className="h-8 text-xxs font-semibold px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 cursor-pointer rounded"
                      >
                        Bulk Waitlist
                      </Button>
                      <Button
                        onClick={() => handleBulkUpdateStatus("rejected")}
                        disabled={submittingAction}
                        className="h-8 text-xxs font-semibold px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer rounded"
                      >
                        Bulk Reject
                      </Button>
                    </div>
                  </div>
                )}

                {dataLoading ? (
                  <div className="p-12 space-y-4 animate-pulse">
                    {[...Array(4)].map((_, idx) => (
                      <div key={idx} className="h-12 bg-neutral-900/40 w-full rounded-lg border border-neutral-850" />
                    ))}
                  </div>
                ) : teams.length > 0 ? (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs table-auto min-w-[800px]">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold tracking-wider uppercase text-xxs">
                          <th className="py-4 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={checkedTeamIds.length === teams.length}
                              onChange={handleSelectAllToggle}
                              className="rounded border-neutral-750 bg-neutral-900 focus:ring-neutral-850 h-3.5 w-3.5 cursor-pointer"
                            />
                          </th>
                          <th className="py-4 px-4">Team & Proposal Info</th>
                          <th className="py-4 px-4 w-28">Status</th>
                          <th className="py-4 px-4 text-center w-60">Status Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850/30">
                        {teams.map((t) => (
                          <tr key={t.id} className="hover:bg-neutral-900/20 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={checkedTeamIds.includes(t.id)}
                                onChange={() => handleTeamCheckToggle(t.id)}
                                className="rounded border-neutral-750 bg-neutral-900 focus:ring-neutral-850 h-3.5 w-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-1.5 max-w-sm">
                                <div className="font-semibold text-neutral-100 text-sm">{t.name}</div>
                                {t.submission && (
                                  <div className="flex flex-col gap-1">
                                    <div className="text-neutral-350 text-xs font-medium">
                                      Title: {t.submission.title}
                                    </div>
                                    <div className="flex gap-3 text-xxs font-mono text-neutral-500 mt-0.5">
                                      {t.submission.pdf_path && (
                                        <a
                                          href={`/api/submissions/file/${t.submission.id}?type=pdf`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                                        >
                                          <FileText className="h-3 w-3 shrink-0" />
                                          <span>PDF Proposal</span>
                                        </a>
                                      )}
                                      {t.submission.youtube_demo_url && (
                                        <a
                                          href={t.submission.youtube_demo_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-1 text-rose-500 hover:underline cursor-pointer"
                                        >
                                          <ExternalLink className="h-3 w-3 shrink-0" />
                                          <span>Demo Video</span>
                                        </a>
                                      )}
                                    </div>
                                    {t.submission.notes && (
                                      <p className="text-[10px] text-neutral-500 italic mt-0.5 leading-normal truncate" title={t.submission.notes}>
                                        Note: {t.submission.notes}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(t.status)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  onClick={() => handleUpdateStatus(t.id, "selected")}
                                  disabled={submittingAction || t.status === "selected"}
                                  className="h-8 text-xxs font-semibold px-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer rounded disabled:opacity-40"
                                >
                                  Select
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleUpdateStatus(t.id, "waiting")}
                                  disabled={submittingAction || t.status === "waiting"}
                                  className="h-8 text-xxs font-semibold px-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 cursor-pointer rounded disabled:opacity-40"
                                >
                                  Wait
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleUpdateStatus(t.id, "rejected")}
                                  disabled={submittingAction || t.status === "rejected"}
                                  className="h-8 text-xxs font-semibold px-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer rounded disabled:opacity-40"
                                >
                                  Reject
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
                    No registered teams found in this segment yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Result Control Console */}
          <div className="space-y-6">
            <h2 className="text-lg font-heading font-semibold text-neutral-200">Segment Console</h2>
            
            {/* Status Statistics */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-neutral-350 text-sm border-b border-neutral-800 pb-2.5">
                   Roster Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-neutral-400">
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-850">
                    <span className="text-[10px] text-neutral-500 block">TOTAL TEAMS</span>
                    <strong className="text-sm font-semibold text-neutral-200">{teams.length}</strong>
                  </div>
                  <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10">
                    <span className="text-[10px] text-amber-500/60 block">SELECTED</span>
                    <strong className="text-sm font-semibold text-amber-400">{selectedCount}</strong>
                  </div>
                  <div className="p-2 rounded bg-orange-500/5 border border-orange-500/10">
                    <span className="text-[10px] text-orange-500/60 block">WAITLISTED</span>
                    <strong className="text-sm font-semibold text-orange-400">{waitlistCount}</strong>
                  </div>
                  <div className="p-2 rounded bg-rose-500/5 border border-rose-500/10">
                    <span className="text-[10px] text-rose-500/60 block">REJECTED</span>
                    <strong className="text-sm font-semibold text-rose-400">{rejectedCount}</strong>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 col-span-2">
                    <span className="text-[10px] text-emerald-400/60 block">FINALISTS (PAID & VERIFIED)</span>
                    <strong className="text-sm font-semibold text-emerald-400">{finalistCount}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Publishing console */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6 space-y-6 font-sans text-xs">
                {/* Preliminary Selections */}
                <div className="space-y-3 pb-6 border-b border-neutral-800">
                  <h4 className="font-semibold text-neutral-300 text-sm">Preliminary Selection Console</h4>
                  <p className="text-xxs text-neutral-500 leading-normal">
                    Triggering Preliminary Publish unlocks the payment submission form only for the {selectedCount} "Selected" teams and sends them a notification.
                  </p>
                  
                  <div className="pt-2">
                    {!activeComp?.preliminary_published ? (
                      <Button
                        variant="primary"
                        onClick={handlePublishPreliminary}
                        disabled={publishing || selectedCount === 0}
                        className="w-full justify-center gap-2 text-xs font-semibold py-3 cursor-pointer"
                      >
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                        <span>Publish Preliminary Results</span>
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 justify-center py-2 bg-warning/5 border border-warning/15 text-warning rounded text-xxs font-mono">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preliminary Results Live</span>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={handleUnpublishPreliminary}
                          disabled={publishing}
                          className="w-full justify-center gap-1.5 text-xxs py-2 border border-neutral-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 cursor-pointer"
                        >
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                          <span>Unpublish Selection</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Selection */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-300 text-sm flex items-center gap-1">
                    <span>Final Selection Console</span>
                    {!activeComp?.preliminary_published && (
                      <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-500 px-1 py-0.5 rounded font-normal">
                        Locked
                      </span>
                    )}
                  </h4>
                  <p className="text-xxs text-neutral-500 leading-normal">
                    Confirm finalist leaderboard visibility publicly on the website. Currently, {finalistCount} teams have paid & verified.
                  </p>

                  <div className="pt-2">
                    {!activeComp?.final_published ? (
                      <Button
                        variant="success"
                        onClick={handlePublishFinal}
                        disabled={publishing || !activeComp?.preliminary_published}
                        className="w-full justify-center gap-2 text-xs font-semibold py-3 cursor-pointer"
                      >
                        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                        <span>Publish Final Leaderboard</span>
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 justify-center py-2 bg-success/5 border border-success/15 text-success rounded text-xxs font-mono">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Final Selection Live</span>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={handleUnpublishFinal}
                          disabled={publishing}
                          className="w-full justify-center gap-1.5 text-xxs py-2 border border-neutral-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 cursor-pointer"
                        >
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                          <span>Unpublish Leaderboard</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
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
