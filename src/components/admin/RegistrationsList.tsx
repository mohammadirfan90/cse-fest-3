"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  Clock,
  HelpCircle,
  Trophy,
  Mail,
  Phone,
  School,
  X,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  Check,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  gender: string;
  university: string;
  department: string;
  semester: string;
  studentId: string;
  tshirtSize: string;
  role: "leader" | "member";
  invitationStatus: string;
}

interface Payment {
  amount: number;
  method: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected" | "resubmission_required";
}

interface Registration {
  id: string;
  name: string;
  status: string;
  competitionId: string;
  competitionName: string;
  competitionType: string;
  createdAt: string;
  leader: Member | null;
  members: Member[];
  payment: Payment | null;
}

interface Competition {
  id: string;
  name: string;
  type: string;
}

export default function RegistrationsList() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  // Selection/Filters
  const [selectedCompId, setSelectedCompId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modal state
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);

  // Mutation and edit states
  const [submittingAction, setSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Add Member Form state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "Male",
    university: "",
    department: "",
    semester: "",
    student_id: "",
    tshirt_size: "M",
  });

  // Edit Member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberForm, setEditMemberForm] = useState({
    member_id: "",
    full_name: "",
    email: "",
    phone: "",
    gender: "Male",
    university: "",
    department: "",
    semester: "",
    student_id: "",
    tshirt_size: "M",
  });

  // Reusable refresh function
  const refreshData = async (activeTeamId?: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/registrations");
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to refresh registrations.");
      
      setRegistrations(json.data.registrations || []);
      if (activeTeamId) {
        const updated = (json.data.registrations || []).find((r: Registration) => r.id === activeTeamId);
        if (updated) {
          setSelectedTeam(updated);
        } else {
          setSelectedTeam(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    }
  };

  // Load Registrations Data on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/registrations");
        const json = await res.json();
        if (!json.success) throw new Error(json.message ?? "Failed to load registrations.");
        
        if (active) {
          setCompetitions(json.data.competitions || []);
          setRegistrations(json.data.registrations || []);
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : "An unexpected error occurred.";
          setErrorMsg(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleOpenModal = (reg: Registration) => {
    setSelectedTeam(reg);
    setIsEditingName(false);
    setEditName(reg.name);
    setIsAddingMember(false);
    setEditingMemberId(null);
    setDeleteConfirmOpen(false);
    setDeleteConfirmText("");
    setModalError(null);
    setNewMemberForm({
      full_name: "",
      email: "",
      phone: "",
      gender: "Male",
      university: reg.leader?.university || "",
      department: "",
      semester: "",
      student_id: "",
      tshirt_size: "M",
    });
  };

  // Save edited Team Name
  const handleSaveName = async () => {
    if (!selectedTeam) return;
    if (!editName.trim() || editName.trim().length < 3) {
      setModalError("Team Name must be at least 3 characters.");
      return;
    }
    if (editName.trim() === selectedTeam.name) {
      setIsEditingName(false);
      return;
    }

    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update team name.");
      
      setIsEditingName(false);
      await refreshData(selectedTeam.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update name.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Change Team Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTeam) return;
    
    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update team status.");
      
      await refreshData(selectedTeam.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Remove member from team
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedTeam) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;

    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}?action=remove_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to remove member.");
      
      await refreshData(selectedTeam.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Save new member to team
  const handleSaveMember = async () => {
    if (!selectedTeam) return;
    
    // Validations
    if (!newMemberForm.full_name.trim()) return setModalError("Full Name is required.");
    if (!newMemberForm.email.trim()) return setModalError("Email is required.");
    if (!newMemberForm.phone.trim()) return setModalError("Phone number is required.");
    if (!newMemberForm.university.trim()) return setModalError("University is required.");
    if (!newMemberForm.department.trim()) return setModalError("Department is required.");
    if (!newMemberForm.semester.trim()) return setModalError("Semester is required.");
    if (!newMemberForm.student_id.trim()) return setModalError("Student ID is required.");

    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}?action=add_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to add teammate.");
      
      setIsAddingMember(false);
      // Reset form fields
      setNewMemberForm({
        full_name: "",
        email: "",
        phone: "",
        gender: "Male",
        university: selectedTeam.leader?.university || "",
        department: "",
        semester: "",
        student_id: "",
        tshirt_size: "M",
      });
      await refreshData(selectedTeam.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add teammate.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Save edited member details
  const handleSaveEditMember = async () => {
    if (!selectedTeam) return;
    if (!editingMemberId) return;

    // Validations
    if (!editMemberForm.full_name.trim()) return setModalError("Full Name is required.");
    if (!editMemberForm.email.trim()) return setModalError("Email is required.");
    if (!editMemberForm.phone.trim()) return setModalError("Phone number is required.");
    if (!editMemberForm.university.trim()) return setModalError("University is required.");
    if (!editMemberForm.department.trim()) return setModalError("Department is required.");
    if (!editMemberForm.semester.trim()) return setModalError("Semester is required.");
    if (!editMemberForm.student_id.trim()) return setModalError("Student ID is required.");

    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}?action=edit_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMemberForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update member details.");

      setEditingMemberId(null);
      await refreshData(selectedTeam.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update member details.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Hard Delete Team
  const handleConfirmDeleteTeam = async () => {
    if (!selectedTeam) return;
    if (deleteConfirmText !== "DELETE") return;

    setSubmittingAction(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to delete team.");
      
      setSelectedTeam(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete team.";
      setModalError(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Compute Overall Stats
  const totalTeamsCount = registrations.length;
  const totalParticipantsCount = registrations.reduce((acc, reg) => {
    // Count leader + accepted members
    const membersCount = reg.members.filter(m => m.invitationStatus === "accepted").length;
    return acc + membersCount;
  }, 0);
  const verifiedTeamsCount = registrations.filter(
    (reg) => reg.payment?.status === "approved" || reg.status === "registered"
  ).length;
  const pendingTeamsCount = registrations.filter(
    (reg) => reg.payment?.status === "pending"
  ).length;

  // Filter registrations based on selected competition, search term, and status filter
  const filteredRegistrations = registrations.filter((reg) => {
    // 1. Competition Segment Filter
    if (selectedCompId !== "all" && reg.competitionId !== selectedCompId) {
      return false;
    }

    // 2. Status Filter
    if (statusFilter !== "all") {
      const isVerified = reg.payment?.status === "approved" || reg.status === "registered" || reg.status === "finalist";
      const isPending = reg.payment?.status === "pending";
      const isForming = reg.status === "forming";
      const isIncomplete = !reg.payment && reg.status !== "registered" && reg.status !== "finalist";

      if (statusFilter === "verified" && !isVerified) return false;
      if (statusFilter === "pending" && !isPending) return false;
      if (statusFilter === "forming" && !isForming && !isIncomplete) return false;
    }

    // 3. Search Term (Team Name, Leader Name, Leader Email, Member Names, Universities)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchTeamName = reg.name.toLowerCase().includes(term);
      const matchLeaderName = reg.leader?.name.toLowerCase().includes(term) ?? false;
      const matchLeaderEmail = reg.leader?.email.toLowerCase().includes(term) ?? false;
      const matchLeaderUniv = reg.leader?.university.toLowerCase().includes(term) ?? false;
      
      const matchMembers = reg.members.some((m) => 
        m.name.toLowerCase().includes(term) || 
        m.email.toLowerCase().includes(term) ||
        m.university.toLowerCase().includes(term)
      );

      if (!matchTeamName && !matchLeaderName && !matchLeaderEmail && !matchLeaderUniv && !matchMembers) {
        return false;
      }
    }

    return true;
  });

  // Framer Motion Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const getStatusBadge = (reg: Registration) => {
    if (reg.status === "selected") {
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold font-mono">Primary Selected / Payment Pending</Badge>;
    }
    if (reg.status === "finalist") {
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold font-mono">Selected</Badge>;
    }
    if (reg.status === "submitted" || reg.status === "registered") {
      return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-semibold font-mono">Registered / Submitted</Badge>;
    }
    return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700 font-semibold font-mono">Forming / Unpaid</Badge>;
  };

  return (
    <div className="space-y-8 select-text">
      
      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Error Loading Data</p>
            <p className="text-xs opacity-90 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-lg bg-sidebar border border-sidebar-border animate-pulse" />
          ))
        ) : (
          <>
            <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-lg border border-sidebar-border bg-sidebar p-6 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block font-mono">Total Teams</span>
                <span className="text-2xl font-bold font-mono text-foreground">{totalTeamsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-lg border border-sidebar-border bg-sidebar p-6 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block font-mono">Total Participants</span>
                <span className="text-2xl font-bold font-mono text-foreground">{totalParticipantsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-lg border border-sidebar-border bg-sidebar p-6 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block font-mono">Verified Teams</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">{verifiedTeamsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-lg border border-sidebar-border bg-sidebar p-6 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block font-mono">Pending Reviews</span>
                <span className="text-2xl font-bold font-mono text-amber-400">{pendingTeamsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Segment Selector tabs (Option A) */}
      <div className="space-y-4">
        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-mono block">
          Select Competition Segment
        </label>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sidebar-border">
          {loading ? (
            <div className="flex gap-2 w-full animate-pulse">
              <div className="h-10 w-28 bg-sidebar rounded-full" />
              <div className="h-10 w-36 bg-sidebar rounded-full" />
              <div className="h-10 w-40 bg-sidebar rounded-full" />
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedCompId("all")}
                className={`px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase border transition-all shrink-0 cursor-pointer ${
                  selectedCompId === "all"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-sidebar border-sidebar-border text-muted-foreground hover:border-sidebar-border/80 hover:text-foreground"
                }`}
              >
                All Segments ({registrations.length})
              </button>
              {competitions.map((comp) => {
                const count = registrations.filter((r) => r.competitionId === comp.id).length;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase border transition-all shrink-0 cursor-pointer ${
                      selectedCompId === comp.id
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-sidebar border-sidebar-border text-muted-foreground hover:border-sidebar-border/80 hover:text-foreground"
                    }`}
                  >
                    {comp.name} ({count})
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Filters & Table View */}
      <Card className="bg-sidebar border-sidebar-border overflow-hidden">
        {/* Search & Filter Header */}
        <CardHeader className="border-b border-sidebar-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-muted-foreground flex items-center gap-2">
              <span>Team Listing</span>
              <span className="text-xs bg-sidebar-accent px-2 py-0.5 rounded-full text-foreground tracking-normal font-sans">
                {filteredRegistrations.length} team{filteredRegistrations.length !== 1 ? "s" : ""} found
              </span>
            </CardTitle>
            
            {/* Input elements */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team, name, university..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 h-9 w-full sm:w-[220px] rounded-md border border-sidebar-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Status Select dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-sidebar-border bg-background text-sm text-foreground focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="all">All Verification Statuses</option>
                <option value="verified">Approved & Registered</option>
                <option value="pending">Pending Payment Review</option>
                <option value="forming">Incomplete / Unpaid</option>
              </select>
            </div>
          </div>
        </CardHeader>

        {/* Data Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-sidebar-border">
            <table className="w-full min-w-[1000px] text-left border-collapse table-auto">
              <thead>
                <tr className="bg-sidebar-accent/50 border-b border-sidebar-border">
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Team Details</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Competition Segment</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Team Leader</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Team Size</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Institution</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Status / Payment</th>
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sidebar-border/30">
                {loading ? (
                  Array.from({ length: 5 }).map((_, rIdx) => (
                    <tr key={rIdx} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, cIdx) => (
                        <td key={cIdx} className="p-4"><div className="h-4 bg-sidebar-accent/50 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-sidebar-accent/10 transition-colors">
                      {/* Team details */}
                      <td className="p-3">
                        <div>
                          <div className="font-semibold text-foreground text-sm">{reg.name}</div>
                        </div>
                      </td>

                      {/* Competition Segment */}
                      <td className="p-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{reg.competitionName}</div>
                          <div className="text-xs text-muted-foreground capitalize">{reg.competitionType}</div>
                        </div>
                      </td>

                      {/* Team Leader */}
                      <td className="p-3">
                        {reg.leader ? (
                          <div>
                            <div className="text-sm font-medium text-foreground">{reg.leader.name}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{reg.leader.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">No Leader Info</span>
                        )}
                      </td>

                      {/* Roster Size */}
                      <td className="p-3">
                        <span className="text-sm font-semibold font-mono text-foreground">
                          {reg.members.filter(m => m.invitationStatus === "accepted").length} members
                        </span>
                      </td>

                      {/* Institution */}
                      <td className="p-3 text-sm text-foreground truncate max-w-[180px]" title={reg.leader?.university || "N/A"}>
                        {reg.leader?.university || "N/A"}
                      </td>

                      {/* Status / Payment */}
                      <td className="p-3">
                        {getStatusBadge(reg)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenModal(reg)}
                          className="text-xs py-1 px-3 border border-sidebar-border bg-sidebar hover:bg-sidebar-accent cursor-pointer"
                        >
                          View Team
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-muted-foreground">
                      <div className="max-w-xs mx-auto space-y-2">
                        <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
                        <p className="text-sm font-semibold">No Registrations Found</p>
                        <p className="text-xs">Try adjusting your search criteria or segment selections.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Simple Pop-up Centered Modal (Option B) */}
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!submittingAction) setSelectedTeam(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-sidebar border border-sidebar-border w-full max-w-2xl rounded-lg shadow-xl overflow-hidden relative p-6 z-10 flex flex-col gap-4 font-sans text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-sidebar-border pb-4">
                <div className="flex-1 mr-4">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 h-8 rounded border border-sidebar-border bg-background text-sm text-foreground focus:border-primary outline-none"
                        placeholder="Team Name"
                        disabled={submittingAction}
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={submittingAction}
                        className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 cursor-pointer"
                        title="Save Team Name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setEditName(selectedTeam.name);
                        }}
                        disabled={submittingAction}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground font-heading">{selectedTeam.name}</h3>
                      <button
                        onClick={() => {
                          setIsEditingName(true);
                          setEditName(selectedTeam.name);
                        }}
                        disabled={submittingAction}
                        className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-sidebar-accent"
                        title="Edit Team Name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-primary font-mono font-bold mt-1 uppercase tracking-wider">
                    {selectedTeam.competitionName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!submittingAction) setSelectedTeam(null);
                  }}
                  disabled={submittingAction}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1 rounded-md hover:bg-sidebar-accent disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Team Listing details */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-sidebar-border">
                {/* Team Info grid */}
                <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg bg-background border border-sidebar-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-mono uppercase tracking-widest text-[9px] mb-0.5">Primary University</span>
                    <strong className="text-foreground text-sm font-sans">{selectedTeam.leader?.university || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-mono uppercase tracking-widest text-[9px] mb-0.5">Team Status</span>
                    <div className="mt-0.5">
                      <select
                        value={selectedTeam.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={submittingAction}
                        className="h-8 px-2 rounded border border-sidebar-border bg-sidebar text-xs text-foreground focus:border-primary outline-none cursor-pointer font-semibold disabled:opacity-50"
                      >
                        <option value="forming">Forming</option>
                        <option value="registered">Registered</option>
                        <option value="submitted">Submitted</option>
                        <option value="selected">Selected</option>
                        <option value="rejected">Rejected</option>
                        <option value="finalist">Finalist</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Level Error Display */}
                {modalError && (
                  <div className="p-3 text-xs rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>{modalError}</div>
                  </div>
                )}

                {/* Member Listing */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-widest">
                    Team Members ({selectedTeam.members.length})
                  </h4>
                  
                  <div className="divide-y divide-sidebar-border/20 border border-sidebar-border rounded-lg bg-background overflow-hidden">
                    {selectedTeam.members.map((member) => {
                      if (editingMemberId === member.id) {
                        return (
                          <div key={member.id} className="p-4 bg-sidebar-accent/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
                                Edit {member.role === "leader" ? "Leader" : "Member"} Details
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingMemberId(null)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-sidebar-accent cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Full Name</label>
                                <input
                                  type="text"
                                  value={editMemberForm.full_name}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, full_name: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Email Address</label>
                                <input
                                  type="email"
                                  value={editMemberForm.email}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Phone Number</label>
                                <input
                                  type="text"
                                  value={editMemberForm.phone}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Gender</label>
                                <select
                                  value={editMemberForm.gender}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, gender: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none cursor-pointer"
                                  disabled={submittingAction}
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">University</label>
                                <input
                                  type="text"
                                  value={editMemberForm.university}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, university: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Department</label>
                                <input
                                  type="text"
                                  value={editMemberForm.department}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, department: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Semester</label>
                                <input
                                  type="text"
                                  value={editMemberForm.semester}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, semester: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-muted-foreground font-semibold">Student ID</label>
                                <input
                                  type="text"
                                  value={editMemberForm.student_id}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, student_id: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                                  disabled={submittingAction}
                                />
                              </div>
                              <div className="space-y-1 sm:col-span-2 font-mono">
                                <label className="text-muted-foreground font-semibold">T-Shirt Size</label>
                                <select
                                  value={editMemberForm.tshirt_size}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, tshirt_size: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none cursor-pointer"
                                  disabled={submittingAction}
                                >
                                  <option value="S">Small (S)</option>
                                  <option value="M">Medium (M)</option>
                                  <option value="L">Large (L)</option>
                                  <option value="XL">Extra Large (XL)</option>
                                  <option value="XXL">Double Extra Large (XXL)</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingMemberId(null)}
                                className="text-xs px-3 h-8 cursor-pointer"
                                disabled={submittingAction}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleSaveEditMember}
                                disabled={submittingAction}
                                className="text-xs px-4 h-8 flex items-center gap-1.5 cursor-pointer"
                              >
                                {submittingAction && <Loader2 className="h-3 w-3 animate-spin" />}
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={member.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <span>{member.name}</span>
                              <Badge
                                variant={member.role === "leader" ? "primary" : "secondary"}
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 ${
                                  member.role === "leader"
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "bg-sidebar-accent text-foreground"
                                }`}
                              >
                                {member.role === "leader" ? "Leader" : "Member"}
                              </Badge>
                              
                              {member.invitationStatus !== "accepted" && (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                                  {member.invitationStatus}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <School className="h-3.5 w-3.5 shrink-0" />
                                <span>{member.university}</span>
                              </div>
                              {member.department && (
                                <div>Dept: <span className="text-foreground font-semibold">{member.department}</span></div>
                              )}
                              {member.semester && (
                                <div>Sem: <span className="text-foreground font-semibold">{member.semester}</span></div>
                              )}
                              {member.studentId && (
                                <div>ID: <span className="text-foreground font-mono font-semibold">{member.studentId}</span></div>
                              )}
                              {member.tshirtSize && (
                                <div>T-Shirt: <span className="text-foreground font-mono font-semibold">{member.tshirtSize}</span></div>
                              )}
                            </div>
                          </div>

                          {/* Contact details & action */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col sm:items-end text-xs text-muted-foreground gap-1">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-mono">{member.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-mono">{member.phone}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Edit Member Button */}
                              <button
                                onClick={() => {
                                  setEditingMemberId(member.id);
                                  setEditMemberForm({
                                    member_id: member.id,
                                    full_name: member.name,
                                    email: member.email,
                                    phone: member.phone,
                                    gender: member.gender || "Male",
                                    university: member.university,
                                    department: member.department,
                                    semester: member.semester,
                                    student_id: member.studentId,
                                    tshirt_size: member.tshirtSize,
                                  });
                                }}
                                disabled={submittingAction}
                                className="p-1.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                                title={`Edit ${member.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              {/* Delete Member Button */}
                              {member.role !== "leader" && (
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                  disabled={submittingAction}
                                  className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer disabled:opacity-50 transition-colors"
                                  title={`Remove ${member.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Teammate Inline Form */}
                  <div className="mt-2">
                    {!isAddingMember ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsAddingMember(true)}
                        disabled={submittingAction}
                        className="text-xs flex items-center gap-1.5 border border-dashed border-sidebar-border hover:bg-sidebar-accent w-full justify-center py-2 h-9 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Teammate</span>
                      </Button>
                    ) : (
                      <div className="border border-sidebar-border rounded-lg bg-background p-4 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-sidebar-border">
                          <h5 className="text-xs font-bold font-mono text-foreground uppercase tracking-widest">
                            New Teammate Details
                          </h5>
                          <button
                            type="button"
                            onClick={() => setIsAddingMember(false)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-sidebar-accent cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Full Name</label>
                            <input
                              type="text"
                              value={newMemberForm.full_name}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Email Address</label>
                            <input
                              type="email"
                              value={newMemberForm.email}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Phone Number</label>
                            <input
                              type="text"
                              value={newMemberForm.phone}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Gender</label>
                            <select
                              value={newMemberForm.gender}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, gender: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none cursor-pointer"
                              disabled={submittingAction}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">University</label>
                            <input
                              type="text"
                              value={newMemberForm.university}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, university: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Department</label>
                            <input
                              type="text"
                              value={newMemberForm.department}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, department: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              placeholder="e.g. CSE"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Semester</label>
                            <input
                              type="text"
                              value={newMemberForm.semester}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, semester: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              placeholder="e.g. 8th"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground font-semibold">Student ID</label>
                            <input
                              type="text"
                              value={newMemberForm.student_id}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, student_id: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none"
                              disabled={submittingAction}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2 font-mono">
                            <label className="text-muted-foreground font-semibold">T-Shirt Size</label>
                            <select
                              value={newMemberForm.tshirt_size}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, tshirt_size: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-sidebar-border bg-sidebar text-foreground focus:border-primary outline-none cursor-pointer"
                              disabled={submittingAction}
                            >
                              <option value="S">Small (S)</option>
                              <option value="M">Medium (M)</option>
                              <option value="L">Large (L)</option>
                              <option value="XL">Extra Large (XL)</option>
                              <option value="XXL">Double Extra Large (XXL)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAddingMember(false)}
                            className="text-xs px-3 h-8 cursor-pointer"
                            disabled={submittingAction}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveMember}
                            disabled={submittingAction}
                            className="text-xs px-4 h-8 flex items-center gap-1.5 cursor-pointer"
                          >
                            {submittingAction && <Loader2 className="h-3 w-3 animate-spin" />}
                            Save Member
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Overview */}
                {selectedTeam.payment && (
                  <div className="space-y-2.5 p-3.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/40 text-xs">
                    <h4 className="font-bold font-mono text-muted-foreground uppercase tracking-widest text-[10px]">
                      Payment Review Details
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Method</span>
                        <span className="text-foreground uppercase font-semibold">{selectedTeam.payment.method}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Amount Paid</span>
                        <span className="text-foreground font-semibold">{selectedTeam.payment.amount} BDT</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Transaction ID</span>
                        <span className="text-foreground font-semibold break-all">{selectedTeam.payment.transactionId}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Dangerous Actions confirmation step */}
                {deleteConfirmOpen && (
                  <div className="p-4 rounded bg-rose-500/10 border border-rose-500/20 text-xs space-y-3">
                    <div>
                      <p className="font-bold text-rose-400 font-mono uppercase tracking-widest text-[10px]">Warning: Dangerous Action</p>
                      <p className="text-muted-foreground mt-0.5">
                        You are about to delete team <strong className="text-foreground">{selectedTeam.name}</strong>.
                        This will delete all members, submissions, and payments from the database and disk.
                      </p>
                      <p className="mt-2 text-rose-400/90 font-semibold font-mono">
                        Type DELETE to confirm.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="px-2 py-1 rounded border border-rose-500/30 bg-sidebar text-foreground text-xs focus:border-rose-500 outline-none flex-1 max-w-[150px] h-8"
                        disabled={submittingAction}
                      />
                      <Button
                        variant="destructive"
                        onClick={handleConfirmDeleteTeam}
                        disabled={deleteConfirmText !== "DELETE" || submittingAction}
                        className="text-xs h-8 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 font-bold cursor-pointer disabled:opacity-50"
                      >
                        {submittingAction && <Loader2 className="h-3 w-3 animate-spin" />}
                        Confirm Delete
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={submittingAction}
                        className="text-xs h-8 border border-sidebar-border cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between border-t border-sidebar-border pt-4 items-center">
                <div>
                  {!deleteConfirmOpen && (
                    <Button
                      variant="ghost"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={submittingAction}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Delete Team
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => setSelectedTeam(null)}
                  disabled={submittingAction}
                  className="px-5 py-2 font-semibold text-xs cursor-pointer"
                >
                  Close View
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
