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
  AlertCircle
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
  university: string;
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

export default function AdminRegistrationsPage() {
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

  // Load Registrations Data
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
    if (reg.payment?.status === "approved" || reg.status === "registered" || reg.status === "finalist") {
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved / Registered</Badge>;
    }
    if (reg.payment?.status === "pending") {
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Pending Review</Badge>;
    }
    if (reg.payment?.status === "resubmission_required") {
      return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Resubmit Payment</Badge>;
    }
    if (reg.payment?.status === "rejected") {
      return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Rejected</Badge>;
    }
    return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">Forming / Unpaid</Badge>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans relative">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-sidebar-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <span>Registrations Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Monitor and review segment-wise registrations, team rosters, and payment statuses for SMUCT CSE Fest 2026.
          </p>
        </div>
      </div>

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
              <span>Roster Listing</span>
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
                  <th className="p-3 text-xs font-mono font-bold text-muted-foreground">Roster Size</th>
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
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{reg.id}</div>
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
                          onClick={() => setSelectedTeam(reg)}
                          className="text-xs py-1 px-3 border border-sidebar-border bg-sidebar hover:bg-sidebar-accent cursor-pointer"
                        >
                          View Roster
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
              onClick={() => setSelectedTeam(null)}
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
                <div>
                  <h3 className="text-lg font-bold text-foreground font-heading">{selectedTeam.name}</h3>
                  <p className="text-xs text-primary font-mono font-bold mt-1 uppercase tracking-wider">
                    {selectedTeam.competitionName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1 rounded-md hover:bg-sidebar-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Roster Listing details */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* Team Info grid */}
                <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg bg-background border border-sidebar-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-mono uppercase tracking-widest text-[9px] mb-0.5">Primary University</span>
                    <strong className="text-foreground text-sm font-sans">{selectedTeam.leader?.university || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-mono uppercase tracking-widest text-[9px] mb-0.5">Team Status</span>
                    <span className="text-foreground capitalize text-sm font-semibold">{selectedTeam.status}</span>
                  </div>
                </div>

                {/* Member Listing */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-widest">
                    Roster Members ({selectedTeam.members.length})
                  </h4>
                  
                  <div className="divide-y divide-sidebar-border/20 border border-sidebar-border rounded-lg bg-background overflow-hidden">
                    {selectedTeam.members.map((member) => (
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
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <School className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>{member.university}</span>
                          </div>
                        </div>

                        {/* Contact details */}
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
                      </div>
                    ))}
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
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-sidebar-border pt-4">
                <Button
                  onClick={() => setSelectedTeam(null)}
                  className="px-5 py-2 font-semibold text-xs"
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
