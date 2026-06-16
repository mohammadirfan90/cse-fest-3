"use client";

import * as React from "react";
import {
  Send,
  Search,
  Check,
  X,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface SubmissionItem {
  score: number | null;
  id: string;
  team_id: string;
  competition_id: string;
  title: string;
  pdf_path: string;
  youtube_demo_url: string | null;
  notes: string | null;
  status: "draft" | "submitted" | "under_review" | "selected" | "rejected";
  submitted_at: string;
  teams: {
    id: string;
    name: string;
    leader_id: string;
  } | null;
  competitions: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = React.useState<SubmissionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [mutatingState, setMutatingState] = React.useState<{ id: string; status: string } | null>(null);
  const [competitions, setCompetitions] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = React.useState<string>('all');

  const countByComp = React.useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s) => {
      if (s.competition_id) {
        map[s.competition_id] = (map[s.competition_id] ?? 0) + 1;
      }
    });
    return map;
  }, [submissions]);

  React.useEffect(() => {
    let active = true;
    async function loadSubmissions() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/submissions");
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (active) {
          setSubmissions(data.data || []);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load submissions queue.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSubmissions();

    return () => {
      active = false;
    };
  }, [refreshTrigger]);

// Fetch competitions for segment tabs
React.useEffect(() => {
  let active = true;
  async function loadCompetitions() {
    try {
      const res = await fetch('/api/admin/competitions');
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (active) setCompetitions(data.data || []);
    } catch (err) {
      console.error('Failed to load competitions', err);
    }
  }
  loadCompetitions();
  return () => { active = false; };
}, []);

  const handleStatusUpdate = async (submissionId: string, status: "under_review" | "selected" | "rejected") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMutatingState({ id: submissionId, status });
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update proposal status.");
      }
      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    } finally {
      setMutatingState(null);
    }
  };

  const handleScoreSave = async (id: string, team_id: string, competition_id: string, score: number | null) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMutatingState({ id, status: "score" });
    try {
      const res = await fetch("/api/admin/submissions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: id, team_id, competition_id, score }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg("Score updated successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update score.");
    } finally {
      setMutatingState(null);
    }
  };

  // Filter listings based on searches and tab filters
  const filteredSubmissions = submissions.filter((s) => {
  const titleMatch = s.title?.toLowerCase() || "";
  const teamNameMatch = s.teams?.name?.toLowerCase() || "";
  const compNameMatch = s.competitions?.name?.toLowerCase() || "";
  const search = searchTerm.toLowerCase();

  const matchesSearch =
    titleMatch.includes(search) ||
    teamNameMatch.includes(search) ||
    compNameMatch.includes(search);

  const matchesStatus = statusFilter === "all" || s.status === statusFilter;
  const matchesCompetition = selectedCompetitionId === "all" || s.competition_id === selectedCompetitionId;

  return matchesSearch && matchesStatus && matchesCompetition;
});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 animate-fade-in font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4.5 w-4.5 text-neutral-550" />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-50 tracking-tight">Project Proposals Queue</h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Review project descriptions, PDF files, and videos from team rosters and evaluate their selection status.
          </p>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2"
          >
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2"
          >
            <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900/60 border border-neutral-850 rounded-lg p-1 flex-wrap backdrop-blur-md">
          {/* Competition Segment Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900/60 border border-neutral-850 rounded-lg p-1 flex-wrap backdrop-blur-md mb-2">
          <button
            key="all"
            onClick={() => setSelectedCompetitionId('all')}
            className={`py-1.5 px-3 text-xs font-semibold tracking-wide font-sans capitalize rounded-md transition-all duration-155 cursor-pointer outline-none ${
              selectedCompetitionId === 'all'
                ? 'bg-neutral-800 text-neutral-50 shadow-sm'
                : 'text-neutral-555 hover:text-neutral-300'
            }`}
          >
            All Competitions <span className="ml-1 font-mono text-sm text-neutral-500">({submissions.length})</span>
          </button>
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelectedCompetitionId(comp.id)}
              className={`py-1.5 px-3 text-xs font-semibold tracking-wide font-sans capitalize rounded-md transition-all duration-155 cursor-pointer outline-none ${
                selectedCompetitionId === comp.id
                  ? 'bg-neutral-800 text-neutral-50 shadow-sm'
                  : 'text-neutral-555 hover:text-neutral-300'
              }`}
            >
              {comp.name} <span className="ml-1 font-mono text-sm text-neutral-500">({countByComp[comp.id] ?? 0})</span>
            </button>
          ))}
        </div>
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-neutral-900/60 border border-neutral-850 rounded-lg p-1 flex-wrap backdrop-blur-md">
          {["all", "submitted", "under_review", "selected", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`py-1.5 px-3 text-xs font-semibold tracking-wide font-sans capitalize rounded-md transition-all duration-155 cursor-pointer outline-none ${
                statusFilter === status
                  ? "bg-neutral-800 text-neutral-50 shadow-sm"
                  : "text-neutral-550 hover:text-neutral-300"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <Input
            placeholder="Search team, proposal title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 h-9.5 text-xs bg-neutral-950 border-neutral-800/80 focus:border-neutral-700"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
        </div>
      </div>

      {/* Grid Submissions List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-neutral-800/20 rounded-lg border border-neutral-800/60 animate-pulse" />
          ))}
        </div>
      ) : filteredSubmissions.length > 0 ? (
        <div className="space-y-4">
          {filteredSubmissions.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 hover:border-neutral-700/60 transition-all duration-150 p-5 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold font-mono text-neutral-500 uppercase tracking-widest">
                        {s.competitions?.name}
                      </span>
                      <span className="text-sm font-mono text-neutral-600 uppercase tracking-widest">
                        • {s.competitions?.type}
                      </span>
                      <Badge
                        variant={
                          s.status === "selected"
                            ? "success"
                            : s.status === "rejected"
                            ? "error"
                            : s.status === "under_review" || s.status === "submitted"
                            ? "warning"
                            : "neutral"
                        }
                        className="capitalize text-sm py-0.5 px-2 font-semibold tracking-wider font-mono rounded"
                      >
                        {s.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-heading font-bold text-neutral-100 leading-tight mt-1">
                      {s.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans">
                      Submitted by Team: <span className="text-neutral-200 font-semibold">{s.teams?.name || "N/A"}</span>
                    </p>
                    {/* Score column */}
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={s.score ?? ""}
                          onChange={(e) => {
                            const newScore = e.target.value ? Number(e.target.value) : null;
                            const updated = [...submissions];
                            const idx = updated.findIndex(sub => sub.id === s.id);
                            updated[idx].score = newScore;
                            setSubmissions(updated);
                          }}
                          className="w-16 text-xs"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleScoreSave(s.id, s.team_id, s.competition_id || "", s.score)}
                          isLoading={mutatingState?.id === s.id && mutatingState?.status === "score"}
                          disabled={!!mutatingState}
                          className="h-8 text-sm px-3"
                        >
                          Save Score
                        </Button>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col lg:flex-row gap-2 shrink-0 self-start">
                    {s.status === "submitted" && (
                      <Button
                        variant="secondary"
                        onClick={() => handleStatusUpdate(s.id, "under_review")}
                        isLoading={mutatingState?.id === s.id && mutatingState?.status === "under_review"}
                        disabled={!!mutatingState}
                        className="text-xs py-1.5 px-3 rounded border border-neutral-850 hover:border-neutral-700 bg-neutral-950 text-neutral-300"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Mark Reviewing</span>
                      </Button>
                    )}
                    {s.status !== "selected" && (
                      <Button
                        variant="success"
                        onClick={() => handleStatusUpdate(s.id, "selected")}
                        isLoading={mutatingState?.id === s.id && mutatingState?.status === "selected"}
                        disabled={!!mutatingState}
                        className="text-xs py-1.5 px-3 rounded border border-success/20 hover:scale-[1.01] transition-transform"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Select Team</span>
                      </Button>
                    )}
                    {s.status !== "rejected" && (
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate(s.id, "rejected")}
                        isLoading={mutatingState?.id === s.id && mutatingState?.status === "rejected"}
                        disabled={!!mutatingState}
                        className="text-xs py-1.5 px-3 rounded border border-error/20 hover:scale-[1.01] transition-transform"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject Proposal</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Proposal Document Link & Notes */}
                <div className="pt-4 border-t border-neutral-850 space-y-4 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-neutral-955 p-3 rounded-lg border border-neutral-850/60">
                      <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <FileText className="h-3.5 w-3.5 text-neutral-450" />
                        <span>Proposal PDF</span>
                      </div>
                      <a
                        href={`/api/submissions/file/${s.id}?type=pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-neutral-350 hover:text-neutral-50 hover:underline flex items-center gap-1 font-semibold transition-colors font-mono"
                      >
                        <span>Open PDF</span>
                        <ExternalLink className="h-3 w-3 text-neutral-500" />
                      </a>
                    </div>

                    {s.youtube_demo_url ? (
                      <div className="flex items-center justify-between bg-neutral-955 p-3 rounded-lg border border-neutral-850/60">
                        <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Video className="h-3.5 w-3.5 text-neutral-455" />
                          <span>Demo Video</span>
                        </div>
                        <a
                          href={s.youtube_demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-neutral-350 hover:text-neutral-50 hover:underline flex items-center gap-1 font-semibold transition-colors font-mono cursor-pointer"
                        >
                          <span>Open Video</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-neutral-955 p-3 rounded-lg border border-neutral-850/20 opacity-50 select-none">
                        <div className="text-sm text-neutral-600 font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Video className="h-3.5 w-3.5" />
                          <span>No Video Provided</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <div className="p-3 bg-neutral-950/20 rounded border border-neutral-850/60 text-xs shadow-inner">
                      <div className="font-semibold text-neutral-550 mb-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-neutral-600" />
                        Roster Technical Notes:
                      </div>
                      <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans">{s.notes}</p>
                    </div>
                  )}

                  <div className="text-sm text-neutral-600 pt-1 flex items-center justify-between font-mono">
                    <span>ID: {s.id}</span>
                    <span>Submitted: {new Date(s.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-neutral-800/80 rounded-xl bg-neutral-900/10">
          <Send className="h-8 w-8 text-neutral-700 mb-4 mx-auto" />
          <h3 className="font-heading font-semibold text-neutral-300 mb-1 text-sm">No Proposals Found</h3>
          <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto leading-relaxed">
            There are no submissions matching this status or query.
          </p>
        </div>
      )}
    </motion.div>
  );
}
