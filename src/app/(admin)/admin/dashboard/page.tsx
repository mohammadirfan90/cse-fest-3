"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Banknote,
  FileCode,
  History,
  Trophy,
  Sliders,
  UserCheck,
  BarChart3,
  Activity,
  Zap,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { DashboardStats } from "@/components/stats";
import { RevenueChart } from "@/components/revenue-chart";
import { RefundReturnRateChart } from "@/components/refund-return-rate-chart";
import { CategoryRankChart, CategoryMixDatum } from "@/components/category-rank-chart";

interface VerificationItem {
  id: string;
  user_id: string;
  id_front_url: string;
  id_back_url: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    university: string;
    student_id: string;
  } | null;
}

interface AuditLogItem {
  id: string;
  admin_name: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  badge,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: "neutral" | "success" | "warning" | "primary" | "secondary";
  badge?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      custom={delay}
      className="rounded-lg border border-border bg-card p-6 shadow-sm flex items-start justify-between w-full hover:border-neutral-350 transition-colors"
    >
      <div className="space-y-1.5">
        <span className="text-xs font-medium tracking-tight text-muted-foreground block">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground font-mono tracking-tight leading-none">
            {value}
          </span>
          {badge}
        </div>
      </div>
      <div className="p-2 rounded bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingUsers: 0,
    totalTeams: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalSubmissions: 0,
    selectedSubmissions: 0,
  });
  const [revenueTrend, setRevenueTrend] = React.useState<{ date: string; revenue: number }[]>([]);
  const [submissionTrend, setSubmissionTrend] = React.useState<{ day: string; submissions: number }[]>([]);
  const [competitionMix, setCompetitionMix] = React.useState<CategoryMixDatum[]>([]);
  const [pendingVerifications, setPendingVerifications] = React.useState<VerificationItem[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([]);
  const [logSearch, setLogSearch] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const supabase = createClient();

  React.useEffect(() => {
    async function loadDashboardStats() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data: profiles, error: profileErr } = await supabase
          .from("profiles")
          .select("id, profile_complete");
        if (profileErr) throw profileErr;

        let total = 0, verified = 0, pending = 0;
        if (profiles) {
          total = profiles.length;
          profiles.forEach((p) => {
            if (p.profile_complete) {
              verified++;
            } else {
              pending++;
            }
          });
        }

        const { count: teamCount, error: teamErr } = await supabase
          .from("teams")
          .select("*", { count: "exact", head: true });
        if (teamErr) throw teamErr;

        const { data: approvedPayments, error: payErr } = await supabase
          .from("payments")
          .select("amount, created_at")
          .eq("status", "approved");
        if (payErr) throw payErr;

        const revSum = (approvedPayments || []).reduce((acc, p) => acc + Number(p.amount), 0);

        // Generate the last 90 days YYYY-MM-DD
        const dates90: string[] = [];
        for (let i = 89; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const formatted = d.toISOString().split("T")[0];
          dates90.push(formatted);
        }

        const revenueByDate: Record<string, number> = {};
        approvedPayments?.forEach((p) => {
          if (p.created_at) {
            const dateStr = new Date(p.created_at).toISOString().split("T")[0];
            revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + Number(p.amount);
          }
        });

        const revTrendData = dates90.map((date) => ({
          date,
          revenue: revenueByDate[date] || 0,
        }));
        setRevenueTrend(revTrendData);

        const { count: pendingPayCount, error: pendingPayErr } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (pendingPayErr) throw pendingPayErr;

        const { data: submissionsData, error: subErr } = await supabase
          .from("submissions")
          .select("submitted_at, status");
        if (subErr) throw subErr;

        let totalSubs = 0, selectedSubs = 0;
        if (submissionsData) {
          totalSubs = submissionsData.length;
          submissionsData.forEach((s) => {
            if (s.status === "selected") selectedSubs++;
          });
        }

        // Submissions trend (last 7 days)
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const last7Days: { day: string; dateStr: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayName = daysOfWeek[d.getDay()];
          last7Days.push({
            day: dayName,
            dateStr: d.toISOString().split("T")[0],
          });
        }

        const submissionsByDate: Record<string, number> = {};
        submissionsData?.forEach((s) => {
          const dateField = s.submitted_at;
          if (dateField) {
            const dateStr = new Date(dateField).toISOString().split("T")[0];
            submissionsByDate[dateStr] = (submissionsByDate[dateStr] || 0) + 1;
          }
        });

        const subTrendData = last7Days.map((item) => ({
          day: item.day,
          submissions: submissionsByDate[item.dateStr] || 0,
        }));
        setSubmissionTrend(subTrendData);

        // Competition popularity mix
        const { data: teamsData, error: teamsErr } = await supabase
          .from("teams")
          .select("id, competition_id");
        if (teamsErr) throw teamsErr;

        const { data: competitionsData, error: compsErr } = await supabase
          .from("competitions")
          .select("id, name");
        if (compsErr) throw compsErr;

        const compMap: Record<string, string> = {};
        competitionsData?.forEach((c) => {
          compMap[c.id] = c.name;
        });

        const counts: Record<string, number> = {};
        let totalTeamsCount = 0;
        teamsData?.forEach((t) => {
          if (t.competition_id) {
            const compName = compMap[t.competition_id] || "Unknown";
            counts[compName] = (counts[compName] || 0) + 1;
            totalTeamsCount++;
          }
        });

        const compMixData = Object.entries(counts).map(([category, count]) => ({
          category,
          share: totalTeamsCount > 0 ? Math.round((count / totalTeamsCount) * 100) : 0,
        }));
        setCompetitionMix(compMixData);

        setStats({
          totalUsers: total,
          verifiedUsers: verified,
          pendingUsers: pending,
          totalTeams: teamCount || 0,
          totalRevenue: revSum,
          pendingPayments: pendingPayCount || 0,
          totalSubmissions: totalSubs,
          selectedSubmissions: selectedSubs,
        });

        setPendingVerifications([]);

        const logsRes = await fetch("/api/admin/audit-logs");
        const logsJson = await logsRes.json();
        if (logsJson.success) {
          setAuditLogs(logsJson.data || []);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard metrics.";
        setErrorMsg(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, [supabase]);

  function getActionMeta(action: string) {
    switch (action) {
      case "CREATE_COMPETITION":
        return { label: "Created Competition", color: "success" as const, icon: Trophy };
      case "UPDATE_COMPETITION":
        return { label: "Updated Competition", color: "neutral" as const, icon: Sliders };
      case "REVIEW_SUBMISSION":
        return { label: "Reviewed Proposal", color: "primary" as const, icon: FileCode };
      case "REVIEW_PAYMENT":
        return { label: "Reviewed Payment", color: "secondary" as const, icon: Banknote };
      case "APPROVE_STUDENT_ID":
        return { label: "Approved Student ID", color: "success" as const, icon: UserCheck };
      case "REJECT_STUDENT_ID":
        return { label: "Rejected Student ID", color: "error" as const, icon: ShieldCheck };
      case "JUDGE_TEAM_SCORE":
        return { label: "Graded Team", color: "primary" as const, icon: BarChart3 };
      case "PUBLISH_LEADERBOARD":
        return { label: "Published Rankings", color: "success" as const, icon: Trophy };
      default:
        return { label: action.replace(/_/g, " ").toLowerCase(), color: "neutral" as const, icon: History };
    }
  }

  // Shimmer skeleton
  if (loading) {
    return (
      <div className="space-y-8" suppressHydrationWarning>
        {/* Header skeleton */}
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-neutral-900/60 w-48 rounded-md" />
          <div className="h-4 bg-neutral-900/40 w-80 rounded-md" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-800/40 rounded-xl border border-neutral-800/60 animate-pulse" />
          ))}
        </div>
        {/* Panels skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 bg-neutral-800/40 w-48 rounded-md animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-800/40 rounded-xl border border-neutral-800/60 animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-6 bg-neutral-800/40 w-32 rounded-md animate-pulse" />
            <div className="h-48 bg-neutral-800/40 rounded-xl border border-neutral-800/60 animate-pulse" />
            <div className="h-36 bg-neutral-800/40 rounded-xl border border-neutral-800/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4 max-w-sm mx-auto">
          <div className="p-4 rounded-full bg-error/10 border border-error/20">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-semibold text-neutral-200 text-sm">Failed to load metrics</h3>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">{errorMsg}</p>
          </div>
          <Button
            variant="secondary"
            className="text-xs gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const verificationPercent =
    stats.totalUsers > 0
      ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
      : 0;

  // Filter audit logs by search string
  const filteredAuditLogs = auditLogs.filter((log) => {
    const search = logSearch.trim().toLowerCase();
    if (!search) return true;
    const meta = getActionMeta(log.action);
    return (
      log.admin_name?.toLowerCase().includes(search) ||
      meta.label.toLowerCase().includes(search) ||
      log.resource_type?.toLowerCase().includes(search)
    );
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header (matching Sales CRM design) */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor registrations, verify credentials, track payments, and oversee festival status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium border border-border bg-card px-4 py-2 rounded-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>System Live</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-normal border border-border rounded-md bg-card text-foreground justify-start shadow-sm cursor-default">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span>CSE Fest Day: July 18, 2026</span>
          </button>
        </div>
      </motion.div>

      {/* Tabs Menu Bar (matching Sales CRM tab list style) */}
      <div className="inline-flex h-10 items-center p-1 bg-muted rounded-md text-muted-foreground">
        <button role="tab" aria-selected="true" className="px-3 py-1.5 text-sm font-medium rounded-sm bg-background text-foreground shadow-sm cursor-default">Overview</button>
        <Link href="/admin/payments" className="px-3 py-1.5 text-sm font-medium rounded-sm hover:text-foreground">Payments</Link>
        <Link href="/admin/submissions" className="px-3 py-1.5 text-sm font-medium rounded-sm hover:text-foreground">Submissions</Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats
          stats={{
            totalUsers: stats.totalUsers,
            totalTeams: stats.totalTeams,
            totalRevenue: stats.totalRevenue,
            verificationRate: verificationPercent,
          }}
        />
      </div>

      {/* Charts Grid */}
      <motion.div
        variants={itemVariants}
        className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      >
        <RevenueChart data={revenueTrend} />
        <RefundReturnRateChart data={submissionTrend} totalSubmissions={stats.totalSubmissions} />
        <CategoryRankChart data={competitionMix} className="md:col-span-2" />
      </motion.div>

      {/* Main Content Layout (matching CRM column layout) */}
      <motion.div
        variants={itemVariants}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7"
      >
        {/* Left Column: Verification Queue + Activity Log (Span 4) */}
        <div className="lg:col-span-4 space-y-6">



          {/* Audit Log Timeline Card */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Admin Activity Log
                </h3>
              </div>
              <div className="w-full sm:w-64 relative">
                <Input
                  placeholder="Filter logs by name, action..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background border-border text-foreground rounded focus:ring-0 focus:border-neutral-400"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="p-6">
              {filteredAuditLogs.length > 0 ? (
                <div className="relative pl-6 space-y-4">
                  {/* Timeline connector */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

                  {filteredAuditLogs.map((log, idx) => {
                    const meta = getActionMeta(log.action);

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="relative group"
                      >
                        {/* Timeline node dot */}
                        <div className="absolute -left-[19.5px] top-2.5 w-2.5 h-2.5 rounded-full border border-border bg-card z-10 transition-colors group-hover:border-primary" />

                        <div className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-all duration-150 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div className="space-y-0.5">
                              <p className="text-xs text-foreground leading-relaxed">
                                <span className="font-semibold">{log.admin_name}</span>
                                {" "}
                                <span className="text-muted-foreground">performed</span>
                                {" "}
                                <span className="text-foreground font-semibold">{meta.label}</span>
                                {" "}
                                <span className="text-muted-foreground">on</span>
                                {" "}
                                <code className="font-mono text-sm bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">
                                  {log.resource_type}
                                </code>
                              </p>
                              {log.resource_id && (
                                <p className="text-sm text-muted-foreground font-mono">
                                  ref: <span>{log.resource_id.slice(0, 16)}...</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono shrink-0">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
                  <History className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs font-sans">No admin actions found.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: System Insights (Span 3) */}
        <div className="lg:col-span-3 space-y-6">



          {/* Roster Summary Card */}
          <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Users className="h-4.5 w-4.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Roster Summary
              </h3>
            </div>
            <div className="space-y-2 font-sans text-xs">
              {[
                { label: "Total Participants", value: stats.totalUsers, icon: Users },
                { label: "Teams Formed", value: stats.totalTeams, icon: Trophy },
                { label: "Completed Profiles", value: stats.verifiedUsers, icon: UserCheck },
                { label: "Incomplete Profiles", value: stats.pendingUsers, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-2.5 border-b border-border/60 last:border-0"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Zap className="h-4.5 w-4.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Manage Payments", href: "/admin/payments" },
                { label: "Review Submissions", href: "/admin/submissions" },
                { label: "Manage Competitions", href: "/admin/competitions" },
              ].map(({ label, href }) => (
                <Link key={href} href={href} className="block">
                  <div className="flex items-center justify-between text-xs font-medium py-2.5 px-3.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-all duration-150 font-sans group">
                    <span>{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

