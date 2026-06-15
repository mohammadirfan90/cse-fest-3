"use client";

import * as React from "react";
import {
  Plus,
  Users,
  UserPlus,
  ShieldAlert,
  Check,
  X,
  AlertCircle,
  Edit,
  Trash2,
  LogOut,
  Crown,
  Lock,
  Calendar,
  BookOpen,
  ExternalLink,
  FileText,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Phone,
  Mail,
  UserCheck,
  Shirt,
  Upload,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    let fileId = "";
    const dMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) {
      fileId = dMatch[1];
    } else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }
  return url;
}

interface Competition {
  id: string;
  name: string;
  type: string;
  eligibility: string;
  entry_fee: number;
  min_members?: number;
  max_members?: number;
  registration_end?: string;
  submission_end?: string;
  rulebook_url?: string | null;
  template_link?: string | null;
  description?: string | null;
}

interface TeamMember {
  id: string;
  user_id: string | null;
  role: "leader" | "member";
  invitation_status: "pending" | "accepted" | "rejected";
  verification_status: "pending" | "approved" | "rejected";
  profiles: {
    full_name: string;
    email: string;
    university: string;
    phone?: string;
    gender?: string;
    department?: string;
    semester?: string;
    student_id?: string;
    tshirt_size?: string;
    id_front_url?: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  competition_id: string;
  leader_id: string;
  status: string;
  leader_confirmed: boolean;
  competitions: Competition | null;
  members: TeamMember[];
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-level-3 font-sans text-xs backdrop-blur-md max-w-sm ${
        type === "success"
          ? "border-success/30 bg-success/10 text-success"
          : "border-error/30 bg-error/10 text-error"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-0 bg-transparent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function VerifBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "border-success/30 bg-success/10 text-success",
    rejected: "border-error/30 bg-error/10 text-error",
    pending: "border-warning/30 bg-warning/10 text-warning",
  };
  return (
    <span
      className={`px-1.5 py-0.5 border rounded text-sm font-mono uppercase tracking-widest shrink-0 ${
        map[status] ?? "border-neutral-800 bg-neutral-900 text-neutral-400"
      }`}
    >
      {status}
    </span>
  );
}

function ConfirmModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-neutral-900/98 border border-neutral-800 rounded-xl p-6 shadow-level-3 relative z-10 space-y-4 font-sans backdrop-blur-lg"
      >
        {children}
      </motion.div>
    </div>
  );
}

function MemberCard({
  member,
  isLeader,
  isDeadlinePassed,
  onKick,
  onSetLeader,
}: {
  member: TeamMember;
  isLeader: boolean;
  isDeadlinePassed: boolean;
  onKick: () => void;
  onSetLeader: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isMemberLeader = member.role === "leader";
  const p = member.profiles;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 overflow-hidden hover:border-neutral-700/60 transition-all duration-200">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isMemberLeader
                ? "bg-warning/15 text-warning border border-warning/30"
                : "bg-neutral-800 text-neutral-300 border border-neutral-700"
            }`}
          >
            {p?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-neutral-100 truncate">
                {p?.full_name || "Unknown"}
              </span>
              {isMemberLeader && (
                <span title="Team Leader">
                  <Crown className="h-3.5 w-3.5 text-warning shrink-0" />
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-500 font-mono truncate">{p?.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <VerifBadge status={member.verification_status} />

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all cursor-pointer border-0 bg-transparent"
            title={expanded ? "Collapse" : "Show Details"}
          >
            <UserCheck className="h-3.5 w-3.5" />
          </button>

          {isLeader && !isMemberLeader && !isDeadlinePassed && (
            <div className="flex items-center gap-1">
              {member.invitation_status === "accepted" && (
                <button
                  type="button"
                  onClick={onSetLeader}
                  className="p-1 rounded text-neutral-500 hover:text-warning hover:bg-neutral-900 transition-all duration-150 cursor-pointer border-0 bg-transparent"
                  title="Set as Team Leader"
                >
                  <Crown className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onKick}
                className="p-1.5 rounded text-neutral-500 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition-all duration-150 cursor-pointer bg-transparent"
                title={
                  member.invitation_status === "pending"
                    ? "Cancel Invitation"
                    : "Remove Member"
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && p && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-neutral-800/70"
          >
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-sans text-neutral-400">
              {p.university && (
                <div className="flex items-start gap-1.5 col-span-2">
                  <GraduationCap className="h-3 w-3 text-neutral-500 mt-0.5 shrink-0" />
                  <span>
                    {p.university}
                    {p.department && ` — ${p.department}`}
                    {p.semester && `, Sem ${p.semester}`}
                  </span>
                </div>
              )}
              {p.student_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-600 font-mono uppercase tracking-wide">ID</span>
                  <span className="font-mono">{p.student_id}</span>
                </div>
              )}
              {p.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-neutral-600 shrink-0" />
                  <span>{p.phone}</span>
                </div>
              )}
              {p.tshirt_size && (
                <div className="flex items-center gap-1.5">
                  <Shirt className="h-3 w-3 text-neutral-600 shrink-0" />
                  <span>Size {p.tshirt_size}</span>
                </div>
              )}
              {p.gender && (
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-600 capitalize">Gender: {p.gender}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TeamsPage() {
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [selectedCompInfo, setSelectedCompInfo] = React.useState<Competition | null>(null);

  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase]);

  // Create team
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamCompId, setNewTeamCompId] = React.useState("");
  const [createLoading, setCreateLoading] = React.useState(false);

  // Rename
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [editLoading, setEditLoading] = React.useState(false);

  // Modals
  const [confirmDisbandId, setConfirmDisbandId] = React.useState<string | null>(null);
  const [disbandLoading, setDisbandLoading] = React.useState(false);

  const [confirmLeaveId, setConfirmLeaveId] = React.useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = React.useState(false);

  const [confirmKickMember, setConfirmKickMember] = React.useState<{
    teamId: string;
    member: TeamMember;
  } | null>(null);
  const [kickLoading, setKickLoading] = React.useState(false);

  const [confirmSetLeader, setConfirmSetLeader] = React.useState<{
    teamId: string;
    member: TeamMember;
  } | null>(null);
  const [setLeaderLoading, setSetLeaderLoading] = React.useState<Record<string, boolean>>({});

  // ─── Roster Wizard States ──────────────────────────────────────────────────
  const [rosterWizardTeamId, setRosterWizardTeamId] = React.useState<string | null>(null);
  const [rosterWizardMemberIndex, setRosterWizardMemberIndex] = React.useState(2); // Start at Member 2
  const [rosterWizardLoading, setRosterWizardLoading] = React.useState(false);
  
  const [rosterForm, setRosterForm] = React.useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    university: "",
    department: "",
    semester: "",
    student_id: "",
    tshirt_size: "",
    id_front_base64: "",
  });
  
  const [idFrontFileName, setIdFrontFileName] = React.useState("");

  const {
    data: teamsRes,
    error: teamsError,
    isLoading: teamsLoading,
    mutate: mutateTeams,
  } = useSWR<{ success: boolean; data: Team[] }>("/api/teams", fetcher);

  const { data: compsRes } = useSWR<{ success: boolean; data: Competition[] }>(
    "/api/public/competitions",
    fetcher
  );

  const teams = React.useMemo(() => (teamsRes?.success ? teamsRes.data : []), [teamsRes]);
  const dbCompetitions = React.useMemo(
    () => (compsRes?.success ? compsRes.data : []),
    [compsRes]
  );

  const activeWizardTeam = React.useMemo(() => {
    return teams.find(t => t.id === rosterWizardTeamId) || null;
  }, [teams, rosterWizardTeamId]);

  useBodyScrollLock(
    confirmSetLeader !== null ||
      confirmDisbandId !== null ||
      confirmLeaveId !== null ||
      confirmKickMember !== null ||
      selectedCompInfo !== null ||
      rosterWizardTeamId !== null
  );

  const showToast = React.useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newTeamCompId) return;
    setCreateLoading(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName, competition_id: newTeamCompId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to create team.");
      
      setNewTeamName("");
      setNewTeamCompId("");
      setShowCreateForm(false);
      await mutateTeams();
      showToast("Team created successfully!", "success");
      
      // Auto-trigger Roster Wizard
      setRosterWizardTeamId(data.data.id);
      setRosterWizardMemberIndex(2);
      resetWizardForm();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create team.";
      setMutationError(errMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditName = async (teamId: string) => {
    if (!editingName.trim()) return;
    setEditLoading(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, name: editingName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update team name.");
      setEditingTeamId(null);
      setEditingName("");
      await mutateTeams();
      showToast("Team name updated.", "success");
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to update team name.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDisbandTeam = async (teamId: string) => {
    setDisbandLoading(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=disband", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to disband team.");
      setConfirmDisbandId(null);
      await mutateTeams();
      showToast("Team disbanded successfully.", "success");
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to disband team.");
    } finally {
      setDisbandLoading(false);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    setLeaveLoading(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to leave team.");
      setConfirmLeaveId(null);
      await mutateTeams();
      showToast("You have left the team.", "success");
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to leave team.");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleKickMember = async (teamId: string, userId: string | null, memberId: string) => {
    setKickLoading(true);
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=remove_member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, user_id: userId, member_id: memberId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to remove member.");
      setConfirmKickMember(null);
      await mutateTeams();
      showToast("Member removed from roster.", "success");
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setKickLoading(false);
    }
  };

  const handleSetLeader = async (teamId: string, userId: string) => {
    const key = `${teamId}-${userId}`;
    setSetLeaderLoading((prev) => ({ ...prev, [key]: true }));
    setMutationError(null);
    try {
      const res = await fetch("/api/teams?action=set_leader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to confirm team leader.");
      setConfirmSetLeader(null);
      await mutateTeams();
      showToast("Team leader confirmed!", "success");
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to confirm team leader.");
    } finally {
      setSetLeaderLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ─── Teammate Roster Wizard Handlers ───────────────────────────────────────
  const handleWizardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMutationError("Student ID front image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setRosterForm((prev) => ({ ...prev, id_front_base64: base64 }));
      setIdFrontFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterWizardTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterWizardTeamId || !activeWizardTeam) return;

    setRosterWizardLoading(true);
    setMutationError(null);

    try {
      if (!rosterForm.id_front_base64) {
        throw new Error("Student ID front card image is required.");
      }

      const res = await fetch("/api/teams?action=add_member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: rosterWizardTeamId, ...rosterForm }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to register teammate.");

      showToast(`Member ${rosterWizardMemberIndex} registered successfully!`, "success");
      await mutateTeams();

      const nextMemberIndex = rosterWizardMemberIndex + 1;
      const maxMembers = activeWizardTeam.competitions?.max_members ?? 3;

      if (nextMemberIndex <= maxMembers) {
        // Go to next member in the wizard
        setRosterWizardMemberIndex(nextMemberIndex);
        resetWizardForm();
      } else {
        // Roster is complete
        setRosterWizardTeamId(null);
        showToast("Team roster setup completed!", "success");
      }
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Failed to register teammate.");
    } finally {
      setRosterWizardLoading(false);
    }
  };

  const resetWizardForm = () => {
    setRosterForm({
      full_name: "",
      email: "",
      phone: "",
      gender: "",
      university: "",
      department: "",
      semester: "",
      student_id: "",
      tshirt_size: "",
      id_front_base64: "",
    });
    setIdFrontFileName("");
    setMutationError(null);
  };

  const closeRosterWizard = () => {
    setRosterWizardTeamId(null);
    resetWizardForm();
  };

  return (
    <div className="space-y-6 relative animate-fade-in max-w-4xl">
      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.message}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-neutral-800/40">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold text-neutral-100 tracking-tight uppercase">
            Team Management
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-1">
            Build your roster, register teammates, and manage your competitions.
          </p>
        </div>
        {!showCreateForm && (
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            className="gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent font-mono text-xs uppercase tracking-wider py-2 rounded transition-all duration-150 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Create Team</span>
          </Button>
        )}
      </div>

      {/* Global Error Banner */}
      <AnimatePresence>
        {(!rosterWizardTeamId && (mutationError || teamsError)) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded border border-error/30 bg-error/10 text-xs text-error font-mono flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{mutationError || "Failed to load roster data."}</span>
            <button
              onClick={() => setMutationError(null)}
              className="ml-auto text-error/60 hover:text-error cursor-pointer border-0 bg-transparent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Team Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="border-neutral-800/40 bg-neutral-900/10 shadow-none rounded-lg p-5 max-w-2xl">
              <CardHeader className="border-b border-neutral-800/40 pb-3 mb-5">
                <CardTitle className="text-xs uppercase font-mono tracking-widest text-neutral-400">
                  Create New Team
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">
                      Team Name
                    </label>
                    <Input
                      placeholder="e.g. Code Knights"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      disabled={createLoading}
                      className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 text-xs h-9"
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">
                      Competition
                    </label>
                    <select
                      value={newTeamCompId}
                      onChange={(e) => setNewTeamCompId(e.target.value)}
                      disabled={createLoading}
                      required
                      className="flex h-9 w-full rounded border border-neutral-800/80 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-neutral-700 transition-all outline-none font-sans cursor-pointer"
                    >
                      <option value="">Select Competition</option>
                      {dbCompetitions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.eligibility})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-neutral-800/40 mt-5">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={createLoading}
                      className="py-2 px-4 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs uppercase tracking-wider transition-all"
                    >
                      Create Team
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      disabled={createLoading}
                      className="py-2 px-4 rounded border border-neutral-800 bg-neutral-950 text-neutral-400 font-mono text-xs uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teams List */}
      {teamsLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-neutral-900/10 border border-neutral-800/40 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-neutral-800/80 rounded bg-neutral-900/10">
          <Users className="h-8 w-8 text-neutral-700 mb-3 mx-auto" />
          <h3 className="font-heading font-semibold text-neutral-400 text-sm mb-1">No Active Teams</h3>
          <p className="text-xs text-neutral-600 font-sans max-w-xs mx-auto leading-relaxed">
            You are not on any teams yet. Create a team above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const isLeader = team.leader_id === currentUserId;
            const isDeadlinePassed = team.competitions?.registration_end
              ? new Date() > new Date(team.competitions.registration_end)
              : false;

            const regEndFormatted = team.competitions?.registration_end
              ? new Date(team.competitions.registration_end).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "TBD";

            const acceptedCount = team.members.filter(
              (m) => m.invitation_status === "accepted"
            ).length;
            const maxMembers = team.competitions?.max_members ?? "?";

            return (
              <Card
                key={team.id}
                className="border-neutral-800/40 bg-neutral-900/10 shadow-none rounded-lg overflow-hidden hover:border-neutral-700/50 transition-all duration-200"
              >
                {/* Status Banner */}
                {isDeadlinePassed ? (
                  <div className="px-5 py-3 border-b border-error/20 bg-error/5 flex items-center gap-2.5 text-xs text-error font-mono tracking-wide">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>ROSTER LOCKED — Registration ended {regEndFormatted}.</span>
                  </div>
                ) : !team.leader_confirmed && isLeader ? (
                  <div className="px-5 py-3 border-b border-warning/20 bg-warning/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-warning font-mono font-semibold">
                      <Crown className="h-3.5 w-3.5 shrink-0" />
                      <span>LEADER NOT CONFIRMED — Submission locked until a leader is designated.</span>
                    </div>
                    <p className="text-sm text-warning/70 font-sans">
                      Click the crown icon next to any member to designate them, or confirm yourself below.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSetLeader(team.id, currentUserId!)}
                      disabled={setLeaderLoading[`${team.id}-${currentUserId}`]}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-warning/30 text-warning hover:bg-warning/15 hover:border-warning/60 transition-all text-sm font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50 bg-transparent"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {setLeaderLoading[`${team.id}-${currentUserId}`]
                        ? "Confirming..."
                        : "Confirm Myself as Leader"}
                    </button>
                  </div>
                ) : team.leader_confirmed ? (
                  <div className="px-5 py-3 border-b border-success/20 bg-success/5 flex items-center gap-2.5 text-xs text-success font-mono">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>LEADER CONFIRMED — Team is ready to submit.</span>
                  </div>
                ) : (
                  <div className="px-5 py-3 border-b border-neutral-800/60 flex items-center gap-2.5 text-xs text-neutral-500 font-mono">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Roster editable until:{" "}
                      <strong className="text-neutral-300">{regEndFormatted}</strong>
                    </span>
                  </div>
                )}

                <div className="p-5 space-y-5">
                  {/* Team Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div className="space-y-2 flex-1">
                      {editingTeamId === team.id ? (
                        <div className="flex items-center gap-2 w-full max-w-sm">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            disabled={editLoading}
                            className="h-9 text-xs bg-neutral-950 border-neutral-800"
                            placeholder="New team name"
                            required
                          />
                          <Button
                            variant="primary"
                            onClick={() => handleEditName(team.id)}
                            isLoading={editLoading}
                            className="h-9 w-9 p-0 shrink-0 flex items-center justify-center"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => { setEditingTeamId(null); setEditingName(""); }}
                            disabled={editLoading}
                            className="h-9 w-9 p-0 shrink-0 flex items-center justify-center hover:border-rose-900 hover:text-error"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-heading font-bold text-neutral-100">
                            {team.name}
                          </h3>
                          {isLeader && !isDeadlinePassed && (
                            <button
                              onClick={() => { setEditingTeamId(team.id); setEditingName(team.name); }}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/60 transition-all cursor-pointer border-0 bg-transparent"
                              title="Rename Team"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-neutral-500 font-sans flex items-center gap-1.5">
                        <span>Competition:</span>
                        <span className="text-neutral-300 font-semibold">
                          {team.competitions?.name}
                        </span>
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 border rounded text-sm uppercase font-mono tracking-widest ${
                          isLeader
                            ? "border-neutral-500 bg-neutral-900 text-neutral-200 font-semibold"
                            : "border-neutral-800 bg-neutral-950/45 text-neutral-500"
                        }`}>
                          {isLeader ? "Leader" : "Member"}
                        </span>

                        <span className={`px-2 py-0.5 border rounded text-sm uppercase font-mono tracking-widest ${
                          team.status === "finalist" || team.status === "selected"
                            ? "border-success/30 bg-success/10 text-success"
                            : team.status === "rejected"
                            ? "border-error/30 bg-error/10 text-error"
                            : team.status === "forming"
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300"
                        }`}>
                          {team.status}
                        </span>

                        <span className="px-2 py-0.5 border border-neutral-800 rounded text-sm font-mono text-neutral-500 bg-neutral-950/40">
                          {acceptedCount} / {maxMembers} members
                        </span>

                        {team.competitions && (
                          <button
                            onClick={() => setSelectedCompInfo(team.competitions)}
                            className="flex items-center gap-1 px-2 py-0.5 border border-neutral-800 rounded text-sm font-mono text-neutral-500 bg-neutral-950/40 hover:border-neutral-700 hover:text-neutral-300 transition-all cursor-pointer"
                          >
                            <BookOpen className="h-3 w-3" />
                            Rules
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLeader ? (
                        !isDeadlinePassed && (
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmDisbandId(team.id)}
                            className="text-xs py-1.5 px-3 border border-error/30 text-error hover:bg-error/10 hover:border-red-800 transition-all gap-1.5 h-8 font-mono uppercase tracking-wider"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Disband Team</span>
                          </Button>
                        )
                      ) : (
                        !isDeadlinePassed && (
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmLeaveId(team.id)}
                            className="text-xs py-1.5 px-3 border border-warning/30 text-warning hover:bg-warning/10 hover:border-amber-800 transition-all gap-1.5 h-8 font-mono uppercase tracking-wider"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Leave Team</span>
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Roster */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest font-mono">
                        Roster
                      </h4>
                      <span className="text-sm text-neutral-600 font-mono">
                        Click <UserCheck className="h-3 w-3 inline" /> to expand member details
                      </span>
                    </div>

                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          isLeader={isLeader}
                          isDeadlinePassed={isDeadlinePassed}
                          onKick={() => setConfirmKickMember({ teamId: team.id, member })}
                          onSetLeader={() => setConfirmSetLeader({ teamId: team.id, member })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Add Teammate Button */}
                  {isLeader && !isDeadlinePassed && acceptedCount < Number(maxMembers) && (
                    <div className="pt-3 border-t border-neutral-800/40">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setRosterWizardTeamId(team.id);
                          setRosterWizardMemberIndex(acceptedCount + 1);
                          resetWizardForm();
                        }}
                        className="gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent font-mono text-xs uppercase tracking-wider py-2 rounded transition-all active:scale-98"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Open Roster Wizard</span>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>

        {/* Set Leader Modal */}
        {confirmSetLeader && (
          <ConfirmModal onClose={() => setConfirmSetLeader(null)}>
            <div className="flex items-start gap-3">
              <Crown className="h-6 w-6 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-heading text-neutral-100">Designate Team Leader?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Set{" "}
                  <strong className="text-neutral-100">
                    {confirmSetLeader.member.profiles?.full_name || "this member"}
                  </strong>{" "}
                  as the official team leader. This confirms their role and unlocks submissions.
                </p>
                <p className="text-sm text-neutral-500 font-mono">
                  You can still transfer leadership before the registration deadline.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => handleSetLeader(confirmSetLeader.teamId, confirmSetLeader.member.user_id!)}
                isLoading={setLeaderLoading[`${confirmSetLeader.teamId}-${confirmSetLeader.member.user_id}`]}
                className="flex-1 py-2 text-xs gap-1.5 bg-warning text-neutral-950 border-transparent font-mono hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Crown className="h-3.5 w-3.5" />
                Confirm as Leader
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmSetLeader(null)}
                className="flex-1 py-2 text-xs transition-all"
              >
                Cancel
              </Button>
            </div>
          </ConfirmModal>
        )}

        {/* Disband Modal */}
        {confirmDisbandId && (
          <ConfirmModal onClose={() => setConfirmDisbandId(null)}>
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-error shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-heading text-neutral-100">Disband Team?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  This will permanently delete the team, all member records, submissions, and payments.
                </p>
                <p className="text-xs text-error font-semibold">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                onClick={() => handleDisbandTeam(confirmDisbandId)}
                isLoading={disbandLoading}
                className="flex-1 py-2 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Disband Team
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDisbandId(null)}
                disabled={disbandLoading}
                className="flex-1 py-2 text-xs transition-all"
              >
                Cancel
              </Button>
            </div>
          </ConfirmModal>
        )}

        {/* Leave Modal */}
        {confirmLeaveId && (
          <ConfirmModal onClose={() => setConfirmLeaveId(null)}>
            <div className="flex items-start gap-3">
              <LogOut className="h-6 w-6 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-heading text-neutral-100">Leave Team?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  You will be removed from the roster and will no longer participate in this
                  competition with this team.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                onClick={() => handleLeaveTeam(confirmLeaveId)}
                isLoading={leaveLoading}
                className="flex-1 py-2 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Leave Team
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmLeaveId(null)}
                disabled={leaveLoading}
                className="flex-1 py-2 text-xs transition-all"
              >
                Cancel
              </Button>
            </div>
          </ConfirmModal>
        )}

        {/* Remove Member Modal */}
        {confirmKickMember && (
          <ConfirmModal onClose={() => setConfirmKickMember(null)}>
            <div className="flex items-start gap-3">
              <Trash2 className="h-6 w-6 text-error shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-heading text-neutral-100">
                  {confirmKickMember.member.invitation_status === "pending"
                    ? "Cancel Invitation?"
                    : "Remove Member?"}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Are you sure you want to{" "}
                  {confirmKickMember.member.invitation_status === "pending"
                    ? "cancel the invitation for"
                    : "remove"}{" "}
                  <strong className="text-neutral-100">
                    {confirmKickMember.member.profiles?.full_name || "this member"}
                  </strong>
                  {" "}from the team?
                  {confirmKickMember.member.invitation_status === "accepted" &&
                    " All their registration data will be deleted."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                onClick={() =>
                  handleKickMember(
                    confirmKickMember.teamId,
                    confirmKickMember.member.user_id,
                    confirmKickMember.member.id
                  )
                }
                isLoading={kickLoading}
                className="flex-1 py-2 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {confirmKickMember.member.invitation_status === "pending"
                  ? "Cancel Invitation"
                  : "Remove Member"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmKickMember(null)}
                disabled={kickLoading}
                className="flex-1 py-2 text-xs transition-all"
              >
                Keep Member
              </Button>
            </div>
          </ConfirmModal>
        )}

        {/* Competition Rules Modal */}
        {selectedCompInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCompInfo(null)}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl bg-neutral-900/98 border border-neutral-800 rounded-xl p-6 shadow-level-3 relative z-10 space-y-5 max-h-[85vh] overflow-y-auto font-sans text-neutral-300 backdrop-blur-lg"
            >
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="space-y-1">
                  <Badge variant="accent" className="text-xs uppercase font-mono font-bold tracking-wider py-0.5">
                    {selectedCompInfo.type}
                  </Badge>
                  <h3 className="text-xl font-bold font-heading text-neutral-50 tracking-tight">
                    {selectedCompInfo.name.toUpperCase()}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCompInfo(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                {selectedCompInfo.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest font-mono">Overview</h4>
                    <p className="text-sm text-neutral-300 leading-relaxed">{selectedCompInfo.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-neutral-800/80 bg-neutral-950/50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm uppercase font-bold tracking-wider text-neutral-500 block">Entry Fee</span>
                    <span className="text-sm font-semibold text-neutral-200 mt-0.5 block">
                      {Number(selectedCompInfo.entry_fee) === 0 ? "Free" : `${selectedCompInfo.entry_fee} BDT`}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm uppercase font-bold tracking-wider text-neutral-500 block">Eligibility</span>
                    <span className="text-sm font-semibold text-neutral-200 mt-0.5 block capitalize">
                      {selectedCompInfo.eligibility || "Open"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm uppercase font-bold tracking-wider text-neutral-500 block">Template</span>
                    {selectedCompInfo.template_link ? (
                      <a href={selectedCompInfo.template_link} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-accent hover:text-accent/85 transition-colors inline-flex items-center gap-1 mt-0.5">
                        <span>Download</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-neutral-500 mt-0.5 block">None required</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest font-mono">Official Rulebook</h4>
                    {selectedCompInfo.rulebook_url && (
                      <a href={selectedCompInfo.rulebook_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="text-sm py-1.5 px-3 h-auto gap-1">
                          <span>Open in Drive</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                  {selectedCompInfo.rulebook_url ? (
                    <div className="w-full aspect-video rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
                      <iframe src={getEmbedUrl(selectedCompInfo.rulebook_url)} className="w-full h-full border-0" allow="autoplay" />
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-neutral-800 rounded bg-neutral-900/10">
                      <FileText className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        No rulebook has been uploaded yet. Check back later or consult the coordinator.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-neutral-800/60">
                <Button variant="secondary" onClick={() => setSelectedCompInfo(null)} className="text-xs py-2 px-4">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ─── Team Roster Wizard Modal ────────────────────────────────────── */}
        {rosterWizardTeamId && activeWizardTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRosterWizard}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-neutral-900/98 border border-neutral-800 rounded-xl p-6 shadow-level-3 relative z-10 space-y-4 font-sans backdrop-blur-lg max-h-[90vh] overflow-y-auto my-4"
            >
              <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-base font-bold font-heading text-neutral-100 uppercase tracking-tight">
                    Roster Wizard: Register Member {rosterWizardMemberIndex}
                  </h3>
                  <p className="text-sm text-neutral-550 mt-0.5">
                    Team: {activeWizardTeam.name} | Roster size required: {activeWizardTeam.competitions?.min_members ?? 1} to {activeWizardTeam.competitions?.max_members ?? 3} members
                  </p>
                </div>
                <button
                  onClick={closeRosterWizard}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress Steps Indicator */}
              <div className="flex items-center gap-2 py-2 border-b border-neutral-850">
                {[...Array((activeWizardTeam.competitions?.max_members ?? 3) - 1)].map((_, i) => {
                  const mIndex = i + 2;
                  const isCurrent = rosterWizardMemberIndex === mIndex;
                  const isDone = rosterWizardMemberIndex > mIndex;
                  return (
                    <div key={mIndex} className="flex items-center gap-1.5 grow">
                      <div className={`flex items-center gap-1.5 text-sm font-mono ${
                        isCurrent ? "text-neutral-100" : isDone ? "text-success" : "text-neutral-600"
                      }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-sm ${
                          isCurrent ? "border-neutral-200 bg-neutral-850" : isDone ? "border-success bg-success/10" : "border-neutral-800"
                        }`}>
                          {isDone ? <Check className="h-2.5 w-2.5" /> : mIndex}
                        </div>
                        <span className="hidden sm:inline">Member {mIndex}</span>
                      </div>
                      {i < (activeWizardTeam.competitions?.max_members ?? 3) - 2 && (
                        <div className={`h-px grow ${isDone ? "bg-success/50" : "bg-neutral-850"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {mutationError && (
                <div className="p-3 rounded border border-error/30 bg-error/10 text-xs text-error font-mono flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{mutationError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterWizardTeammate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "full_name", placeholder: "e.g. John Doe", required: true },
                    { label: "Email Address", key: "email", placeholder: "member@university.edu.bd", required: true, type: "email" },
                    { label: "Phone Number", key: "phone", placeholder: "e.g. 01712345678", required: true },
                    { label: "University", key: "university", placeholder: "e.g. SMUCT", required: true },
                    { label: "Department", key: "department", placeholder: "e.g. CSE", required: true },
                    { label: "Semester", key: "semester", placeholder: "e.g. 8th", required: true },
                    { label: "Student ID", key: "student_id", placeholder: "e.g. 201071024", required: true },
                  ].map(({ label, key, placeholder, required, type }) => (
                    <div key={key} className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest">
                        {label}
                      </label>
                      <Input
                        type={type ?? "text"}
                        placeholder={placeholder}
                        value={rosterForm[key as keyof typeof rosterForm]}
                        onChange={(e) => setRosterForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 text-xs h-9"
                        required={required}
                      />
                    </div>
                  ))}

                  {/* Gender */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest">Gender</label>
                    <select
                      value={rosterForm.gender}
                      onChange={(e) => setRosterForm((prev) => ({ ...prev, gender: e.target.value }))}
                      required
                      className="flex h-9 w-full rounded border border-neutral-800/80 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-neutral-700 outline-none cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* T-Shirt Size */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest">T-Shirt Size</label>
                    <select
                      value={rosterForm.tshirt_size}
                      onChange={(e) => setRosterForm((prev) => ({ ...prev, tshirt_size: e.target.value }))}
                      required
                      className="flex h-9 w-full rounded border border-neutral-800/80 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-neutral-700 outline-none cursor-pointer"
                    >
                      <option value="">Select Size</option>
                      {["S", "M", "L", "XL", "XXL"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ID Card Front Upload */}
                <div className="flex flex-col space-y-2 pt-2">
                  <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest">
                    Student ID Card (Front Side) Image
                  </label>
                  <div className={`relative border border-dashed rounded-lg p-5 bg-neutral-950/40 text-center transition-all cursor-pointer ${
                    idFrontFileName ? "border-success/40 bg-success/5" : "border-neutral-800 hover:border-neutral-700"
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWizardFileChange}
                      required={!rosterForm.id_front_base64}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {idFrontFileName ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                          <span className="text-sm text-neutral-300 font-semibold">{idFrontFileName}</span>
                          <span className="text-sm text-success/60 font-mono">Front Side Attached</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-neutral-550 shrink-0" />
                          <span className="text-sm text-neutral-400 font-mono">
                            Select image or drag here
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-800/40">
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={rosterWizardLoading}
                    className="flex-1 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs uppercase tracking-wider transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {rosterWizardMemberIndex === (activeWizardTeam.competitions?.max_members ?? 3)
                        ? "Complete Roster"
                        : "Save & Continue"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={closeRosterWizard}
                    disabled={rosterWizardLoading}
                    className="flex-1 py-2 rounded border border-neutral-800 bg-neutral-950 text-neutral-400 font-mono text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
