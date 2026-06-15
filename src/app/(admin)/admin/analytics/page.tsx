"use client";

import * as React from "react";
import {
  TrendingUp,
  Banknote,
  Users,
  Percent,
  Download,
  BarChart3,
  Sparkles,
  LineChart as LineIcon,
} from "lucide-react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CompItem {
  id: string;
  name: string;
}

interface AnalyticsData {
  registrationTrends: Array<{ date: string; count: number }>;
  competitionShares: Array<{ name: string; teamsCount: number }>;
  universityStats: Array<{ university: string; count: number }>;
  paymentCollections: Array<{ method: string; total: number }>;
  summary: {
    totalRevenue: number;
    averageTeamsPerComp: number;
    verifiedRatio: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SOLID_COLORS = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-tertiary)",
  "var(--color-success)",
  "var(--color-warning)"
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    fill?: string;
    name?: string;
    value: number | string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-950 border border-neutral-850 rounded p-2.5 shadow-level-2 min-w-[120px] text-left">
        <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index: number) => {
            const color = entry.color || entry.fill;
            const displayColor = typeof color === "string" && color.startsWith("url")
              ? (color.includes("Primary") ? "var(--color-primary)"
                : color.includes("Secondary") ? "var(--color-secondary)"
                : color.includes("Tertiary") ? "var(--color-tertiary)"
                : color.includes("Success") ? "var(--color-success)"
                : "var(--color-warning)")
              : color;
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="text-sm font-sans text-neutral-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: displayColor || "transparent" }} />
                  {entry.name}
                </span>
                <span className="text-sm font-mono font-bold text-neutral-200">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const [exportType, setExportType] = React.useState<"teams" | "payments" | "rankings">("teams");
  const [selectedCompId, setSelectedCompId] = React.useState<string>("");

  const { data: analyticsRes, error: analyticsErr, isLoading } = useSWR<{ success: boolean; data: AnalyticsData }>(
    "/api/admin/analytics",
    fetcher
  );

  const { data: compRes } = useSWR<{ success: boolean; data: CompItem[] }>(
    "/api/admin/competitions",
    fetcher
  );

  const competitions = React.useMemo(() => compRes?.data || [], [compRes]);
  const analytics = React.useMemo(() => analyticsRes?.data, [analyticsRes]);

  const handleExport = () => {
    let url = `/api/admin/export?type=${exportType}`;
    if (selectedCompId) {
      url += `&competition_id=${selectedCompId}`;
    }
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2 animate-pulse">
          <div className="h-7 bg-neutral-800/60 w-1/4 rounded-lg" />
          <div className="h-4 bg-neutral-800/40 w-1/3 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-neutral-800/40 rounded-xl border border-neutral-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 bg-neutral-800/40 rounded-xl border border-neutral-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (analyticsErr || !analytics) {
    return (
      <div className="py-20 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
        <div className="max-w-sm mx-auto space-y-4">
          <p className="text-sm text-error font-sans">Failed to load analytics dashboard.</p>
          <Button variant="secondary" className="text-xs" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Revenue",
      value: `${analytics.summary.totalRevenue.toLocaleString()} BDT`,
      icon: Banknote,
    },
    {
      label: "Avg Teams / Comp",
      value: String(analytics.summary.averageTeamsPerComp),
      icon: Users,
    },
    {
      label: "Verification Rate",
      value: `${analytics.summary.verifiedRatio}%`,
      icon: Percent,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LineIcon className="h-4.5 w-4.5 text-neutral-500" />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-50 tracking-tight">Analytics & Insights</h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Registration growth, university distribution, competition shares, and collections reports.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 hover:border-neutral-700/60 transition-all duration-150 p-5 rounded-lg flex items-center justify-between w-full relative group">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-neutral-500 font-sans uppercase tracking-widest block">{card.label}</span>
                <h4 className="text-2xl font-heading font-bold font-mono text-neutral-200">{card.value}</h4>
              </div>
              <div className="p-2.5 rounded border border-neutral-850 bg-neutral-950 text-neutral-400 transition-colors group-hover:text-neutral-200">
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Registration Trend */}
        <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 rounded-lg p-5">
          <CardHeader className="p-0 pb-3 mb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-neutral-500" />
              <span>Registration Trend (Last 15 Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.registrationTrends} margin={{ top: 5, right: 10, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <YAxis stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-neutral-800)", strokeWidth: 1 }} />
                <Line type="monotone" dataKey="count" name="Registrations" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 2, fill: "var(--color-primary)", strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Teams by Competition */}
        <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 rounded-lg p-5">
          <CardHeader className="p-0 pb-3 mb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-neutral-500" />
              <span>Registered Teams by Competition</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.competitionShares} margin={{ top: 5, right: 10, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => v.substring(0, 10) + (v.length > 10 ? "..." : "")} tick={{ fill: "var(--color-neutral-500)" }} />
                <YAxis stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-neutral-900)", opacity: 0.15 }} />
                <Bar dataKey="teamsCount" name="Teams" radius={[2, 2, 0, 0]}>
                  {analytics.competitionShares.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={SOLID_COLORS[index % SOLID_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: University Leaderboard */}
        <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 rounded-lg p-5">
          <CardHeader className="p-0 pb-3 mb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-neutral-500" />
              <span>Top 5 Universities</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={analytics.universityStats} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line-color)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <YAxis dataKey="university" type="category" stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} width={90} tickFormatter={(val) => val.substring(0, 12)} tick={{ fill: "var(--color-neutral-500)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-neutral-900)", opacity: 0.15 }} />
                <Bar dataKey="count" name="Participants" fill="var(--color-primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Gateway Collections */}
        <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 rounded-lg p-5">
          <CardHeader className="p-0 pb-3 mb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-neutral-500" />
              <span>Gateway Collections Split</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.paymentCollections} margin={{ top: 5, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line-color)" vertical={false} />
                <XAxis dataKey="method" stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <YAxis stroke="var(--color-neutral-700)" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "var(--color-neutral-500)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-neutral-900)", opacity: 0.15 }} />
                <Bar dataKey="total" name="Amount (BDT)" radius={[2, 2, 0, 0]}>
                  <Cell fill="var(--color-primary)" />
                  <Cell fill="var(--color-secondary)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Card */}
      <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 max-w-2xl p-5 rounded-lg">
        <CardHeader className="p-0 pb-3 mb-4 border-b border-neutral-850">
          <CardTitle className="flex items-center gap-2 text-neutral-300">
            <Download className="h-4.5 w-4.5 text-neutral-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">CSV Data Export</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 font-sans text-xs p-0 pt-1">
          <p className="text-neutral-400 leading-relaxed">
            Download RFC 4180 CSV spreadsheets directly from the database. Filter by type and competition.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-500 text-sm font-mono uppercase tracking-widest block">Export Category</label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-neutral-200 focus:border-neutral-700 hover:border-neutral-700/80 outline-none font-sans cursor-pointer appearance-none pr-10 transition-colors"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as "teams" | "payments" | "rankings")}
                >
                  <option value="teams">Teams & Members List</option>
                  <option value="payments">Approved Payments History</option>
                  <option value="rankings">Competition Rankings</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-500 text-sm font-mono uppercase tracking-widest block">Competition Filter</label>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-neutral-200 focus:border-neutral-700 hover:border-neutral-700/80 outline-none font-sans cursor-pointer appearance-none pr-10 transition-colors"
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                >
                  <option value="">All Competitions</option>
                  {competitions.map((comp) => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-850">
            <Button variant="primary" onClick={handleExport} className="gap-1.5 text-xs py-2 px-5 font-semibold bg-neutral-50 border border-neutral-200 hover:bg-neutral-200 text-neutral-950 hover:scale-[1.01] transition-transform rounded">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

