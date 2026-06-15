"use client";

import * as React from "react";
import {
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
  Crown,
  ShieldCheck,
  ShieldX,
  Clock,
  FileText,
  Video,
  ExternalLink,
  User,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Type Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface IdCard {
  front_url: string;
  back_url: string;
  status: string;
}

interface MemberProfile {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  university: string;
  department: string;
  semester: string;
  student_id: string;
  github: string;
  skills: string;
  bio: string;
  tshirt_size: string;
  profile_complete: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: "leader" | "member";
  invitation_status: "pending" | "accepted" | "rejected";
  verification_status: "pending" | "approved" | "rejected";
  joined_at: string | null;
  profile: MemberProfile | null;
  id_card: IdCard | null;
}

interface TeamSubmission {
  id: string;
  title: string;
  pdf_path: string;
  video_path: string | null;
  notes: string | null;
  status: string;
  submitted_at: string;
}

interface ReviewTeam {
  id: string;
  name: string;
  status: string;
  leader_id: string;
  leader_confirmed: boolean;
  competition: {
    id: string;
    name: string;
    submission_end: string | null;
  } | null;
  members: TeamMember[];
  submission: TeamSubmission | null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Helper Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VerifBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-success/30 bg-success/10 text-success text-sm font-mono uppercase tracking-wider">
        <ShieldCheck className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-error/30 bg-error/10 text-error text-sm font-mono uppercase tracking-wider">
        <ShieldX className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-warning/30 bg-warning/10 text-warning text-sm font-mono uppercase tracking-wider">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function TeamStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    forming: "border-neutral-800 bg-neutral-900/40 text-neutral-400",
    registered: "border-primary/30 bg-primary/10 text-primary",
    submitted: "border-warning/30 bg-warning/10 text-warning",
    judging_ready: "border-success/30 bg-success/10 text-success",
    selected: "border-success/30 bg-success/10 text-success",
    rejected: "border-error/30 bg-error/10 text-error",
    finalist: "border-secondary/30 bg-secondary/10 text-secondary",
  };
  return (
    <span className={`px-2 py-0.5 border rounded text-sm uppercase font-mono tracking-widest ${map[status] ?? "border-neutral-800 bg-neutral-900 text-neutral-400"}`}>
      {status}
    </span>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TeamReviewPage() {
  const [teams, setTeams] = React.useState<ReviewTeam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [actionMsg, setActionMsg] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedTeamIds, setExpandedTeamIds] = React.useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = React.useState<{ [memberId: string]: boolean }>({});

  // Member modal state
  const [selectedMember, setSelectedMember] = React.useState<{ member: TeamMember; teamId: string } | null>(null);
  // Submission viewer state
  const [viewSubmission, setViewSubmission] = React.useState<TeamSubmission | null>(null);

  useBodyScrollLock(selectedMember !== null || viewSubmission !== null);

  const loadTeams = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/team-review");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load team data.");
      setTeams(data.data as ReviewTeam[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load team data.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTeams]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleMemberAction = async (memberId: string, teamId: string, action: "approve" | "reject") => {
    setActionLoading((prev) => ({ ...prev, [memberId]: true }));
    setActionMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/team-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, action }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setActionMsg(data.message);

      // Close modal if open for this member
      if (selectedMember?.member.id === memberId) {
        setSelectedMember(null);
      }

      // Refresh data
      await loadTeams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      setErrorMsg(msg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const filteredTeams = React.useMemo(() => {
    if (!searchTerm.trim()) return teams;
    const q = searchTerm.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.competition?.name.toLowerCase().includes(q) ||
        t.members.some((m) => m.profile?.full_name.toLowerCase().includes(q))
    );
  }, [teams, searchTerm]);

  // â”€â”€ Render â”€â”€

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 bg-neutral-900 w-1/3 rounded-sm" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-neutral-900/40 border border-neutral-800/40 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-neutral-800/40">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold text-neutral-100 tracking-tight uppercase">
            Team Review Panel
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-1">
            Review team members, verify student IDs, and approve teams for the judging round.
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 pointer-events-none" />
          <Input
            placeholder="Search teams or members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-neutral-950 border-neutral-800 focus:border-neutral-700 hover:border-neutral-700/60 text-neutral-300 placeholder:text-neutral-600 font-mono"
          />
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded border border-error/30 bg-error/10 text-xs text-error font-mono flex items-start gap-2 animate-slide-down">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {actionMsg && (
        <div className="p-3.5 rounded border border-success/30 bg-success/10 text-xs text-success font-mono flex items-start gap-2 animate-slide-down">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Teams", value: teams.length, color: "text-neutral-100" },
          { label: "Submitted", value: teams.filter((t) => t.submission).length, color: "text-warning" },
          { label: "Judging Ready", value: teams.filter((t) => t.status === "judging_ready").length, color: "text-success" },
          { label: "Rejected", value: teams.filter((t) => t.status === "rejected").length, color: "text-error" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded border border-neutral-800/40 bg-neutral-900/10 space-y-1">
            <p className="text-sm text-neutral-500 font-mono uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team List */}
      {filteredTeams.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-neutral-800/80 rounded bg-neutral-900/10">
          <Users className="h-8 w-8 text-neutral-700 mb-3 mx-auto" />
          <h3 className="font-heading font-semibold text-neutral-400 text-sm mb-1">No teams found</h3>
          <p className="text-xs text-neutral-600 font-sans">{searchTerm ? "Try a different search." : "No teams have registered yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTeams.map((team) => {
            const isExpanded = expandedTeamIds.has(team.id);
            const acceptedMembers = team.members.filter((m) => m.invitation_status === "accepted");
            const approvedCount = acceptedMembers.filter((m) => m.verification_status === "approved").length;
            const rejectedCount = acceptedMembers.filter((m) => m.verification_status === "rejected").length;
            const pendingCount = acceptedMembers.filter((m) => m.verification_status === "pending").length;

            return (
              <Card key={team.id} className="border-neutral-800/40 bg-neutral-900/10 shadow-none rounded-lg overflow-hidden">
                {/* Team Header Row */}
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-900/20 transition-all duration-150 cursor-pointer"
                  onClick={() => toggleTeam(team.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-neutral-900 border border-neutral-800/60 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-neutral-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-heading font-bold text-neutral-100">{team.name}</span>
                        {team.leader_confirmed && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-success/30 bg-success/10 text-success text-sm font-mono uppercase tracking-wider">
                            <Crown className="h-2.5 w-2.5" /> Leader Set
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 font-sans truncate">
                        {team.competition?.name ?? "No Competition"} • {acceptedMembers.length} members
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Member verification mini-stats */}
                    <div className="hidden sm:flex items-center gap-2 text-sm font-mono">
                      {approvedCount > 0 && (
                        <span className="text-success">{approvedCount} ✓</span>
                      )}
                      {pendingCount > 0 && (
                        <span className="text-warning">{pendingCount} ⏳</span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="text-error">{rejectedCount} ✗</span>
                      )}
                    </div>

                    <TeamStatusBadge status={team.status} />

                    {team.submission && (
                      <button
                        type="button"
                        className="p-1.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-200 hover:border-neutral-700 transition-all"
                        title="View Submission"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewSubmission(team.submission);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                </button>

                {/* Expanded Members List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-3 border-t border-neutral-800/40 space-y-2">
                        <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest mb-3">
                          Roster Members
                        </p>
                        {acceptedMembers.length === 0 ? (
                          <p className="text-xs text-neutral-600 font-sans italic">No accepted members yet.</p>
                        ) : (
                          acceptedMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-3 p-3 rounded border border-neutral-800/60 bg-neutral-950/40 hover:border-neutral-700/60 transition-all text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                                  {member.role === "leader" ? (
                                    <Crown className="h-3.5 w-3.5 text-gold" />
                                  ) : (
                                    <User className="h-3.5 w-3.5 text-neutral-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMember({ member, teamId: team.id })}
                                    className="font-semibold text-neutral-200 hover:text-white hover:underline transition-all text-left cursor-pointer border-0 bg-transparent p-0 outline-none"
                                  >
                                    {member.profile?.full_name || "Unknown"}
                                  </button>
                                  <p className="text-sm text-neutral-500 font-mono truncate">
                                    {member.profile?.university || "—"} • {member.profile?.student_id || "No ID"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <VerifBadge status={member.verification_status} />
                                {member.verification_status === "pending" && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMemberAction(member.id, team.id, "approve")}
                                      disabled={actionLoading[member.id]}
                                      className="p-1.5 rounded border border-success/30 text-success hover:bg-success/10 hover:border-success transition-all disabled:opacity-50 cursor-pointer bg-transparent"
                                      title="Approve Member"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMemberAction(member.id, team.id, "reject")}
                                      disabled={actionLoading[member.id]}
                                      className="p-1.5 rounded border border-error/30 text-error hover:bg-error/10 hover:border-error transition-all disabled:opacity-50 cursor-pointer bg-transparent"
                                      title="Reject Member"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Member Profile Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl bg-neutral-900/97 border border-neutral-800 rounded-2xl shadow-level-3 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-800/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    {selectedMember.member.role === "leader" ? (
                      <Crown className="h-5 w-5 text-gold" />
                    ) : (
                      <User className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-heading font-bold text-neutral-100">
                      {selectedMember.member.profile?.full_name || "Unknown Member"}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-neutral-500 font-mono">
                        {selectedMember.member.role === "leader" ? "Team Leader" : "Member"}
                      </span>
                      <VerifBadge status={selectedMember.member.verification_status} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-all border-0 bg-transparent cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-6">
                {/* Profile Info Grid */}
                <div>
                  <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest mb-3">Profile Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-sans">
                    {[
                      { label: "Full Name", value: selectedMember.member.profile?.full_name },
                      { label: "Email", value: selectedMember.member.profile?.email },
                      { label: "Phone", value: selectedMember.member.profile?.phone },
                      { label: "Gender", value: selectedMember.member.profile?.gender },
                      { label: "University", value: selectedMember.member.profile?.university },
                      { label: "Department", value: selectedMember.member.profile?.department },
                      { label: "Semester", value: selectedMember.member.profile?.semester },
                      { label: "Student ID", value: selectedMember.member.profile?.student_id },
                      { label: "T-Shirt Size", value: selectedMember.member.profile?.tshirt_size },
                    ].map((field) => (
                      <div key={field.label} className="space-y-1 p-2.5 rounded bg-neutral-950/60 border border-neutral-800/60">
                        <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">{field.label}</p>
                        <p className="text-neutral-200 font-semibold break-all">{field.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills / Bio */}
                {(selectedMember.member.profile?.skills || selectedMember.member.profile?.bio) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                    {selectedMember.member.profile?.skills && (
                      <div className="space-y-1 p-2.5 rounded bg-neutral-950/60 border border-neutral-800/60">
                        <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Skills</p>
                        <p className="text-neutral-300 leading-relaxed">{selectedMember.member.profile.skills}</p>
                      </div>
                    )}
                    {selectedMember.member.profile?.bio && (
                      <div className="space-y-1 p-2.5 rounded bg-neutral-950/60 border border-neutral-800/60">
                        <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Bio</p>
                        <p className="text-neutral-300 leading-relaxed">{selectedMember.member.profile.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Student ID Cards */}
                {selectedMember.member.id_card ? (
                  <div>
                    <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest mb-3">Student ID Card</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Front", url: selectedMember.member.id_card.front_url },
                        { label: "Back", url: selectedMember.member.id_card.back_url },
                      ].map((side) => (
                        <div key={side.label} className="space-y-1.5">
                          <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">{side.label}</p>
                          {side.url ? (
                            <div className="w-full aspect-3/2 relative rounded border border-neutral-800 bg-neutral-950/40 overflow-hidden flex items-center justify-center">
                              <img
                                src={side.url}
                                alt={`ID ${side.label}`}
                                className="w-full h-full object-contain rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-3/2 rounded border border-neutral-800 bg-neutral-950 flex items-center justify-center text-neutral-700 text-xs font-mono">
                              Not uploaded
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded border border-neutral-800 bg-neutral-950/40 text-center text-xs text-neutral-600 font-mono">
                    No student ID card uploaded
                  </div>
                )}
              </div>

              {/* Modal Footer â€” Approve/Reject Actions */}
              {selectedMember.member.verification_status === "pending" && (
                <div className="p-5 border-t border-neutral-800/60 flex gap-3">
                  <Button
                    variant="success"
                    onClick={() => handleMemberAction(selectedMember.member.id, selectedMember.teamId, "approve")}
                    isLoading={actionLoading[selectedMember.member.id]}
                    className="flex-1 gap-2 text-xs font-mono uppercase tracking-wider animate-none"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve Member
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleMemberAction(selectedMember.member.id, selectedMember.teamId, "reject")}
                    isLoading={actionLoading[selectedMember.member.id]}
                    className="flex-1 gap-2 text-xs font-mono uppercase tracking-wider animate-none"
                  >
                    <ShieldX className="h-4 w-4" />
                    Reject Member
                  </Button>
                </div>
              )}
              {selectedMember.member.verification_status !== "pending" && (
                <div className="p-5 border-t border-neutral-800/60 text-center">
                  <VerifBadge status={selectedMember.member.verification_status} />
                  <p className="text-sm text-neutral-600 font-mono mt-2">
                    This member has already been reviewed.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Submission Viewer Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {viewSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewSubmission(null)}
              className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-lg bg-neutral-900/97 border border-neutral-800 rounded-2xl shadow-level-3 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-800/60">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-neutral-400" />
                  <h2 className="text-base font-heading font-bold text-neutral-100">Submission Details</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewSubmission(null)}
                  className="p-1.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-all border-0 bg-transparent cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 text-xs font-sans">
                <div className="space-y-1 p-3 rounded bg-neutral-950/60 border border-neutral-800">
                  <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Title</p>
                  <p className="text-neutral-100 font-semibold text-sm">{viewSubmission.title}</p>
                </div>
                <div className="space-y-1 p-3 rounded bg-neutral-950/60 border border-neutral-800">
                  <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Status</p>
                  <Badge variant="neutral" className="font-mono capitalize text-sm">{viewSubmission.status}</Badge>
                </div>
                {viewSubmission.notes && (
                  <div className="space-y-1 p-3 rounded bg-neutral-950/60 border border-neutral-800">
                    <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Notes</p>
                    <p className="text-neutral-300 leading-relaxed">{viewSubmission.notes}</p>
                  </div>
                )}
                <div className="space-y-1 p-3 rounded bg-neutral-950/60 border border-neutral-800">
                  <p className="text-sm font-mono text-neutral-600 uppercase tracking-widest">Submitted At</p>
                  <p className="text-neutral-300">{new Date(viewSubmission.submitted_at).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <a
                    href={`/api/submissions/file/${viewSubmission.id}?type=pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded border border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all font-mono text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Proposal PDF</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  {viewSubmission.video_path && (
                    <a
                      href={`/api/submissions/file/${viewSubmission.id}?type=video`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded border border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all font-mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Video className="h-4 w-4" />
                      <span>Play Demo Video</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

