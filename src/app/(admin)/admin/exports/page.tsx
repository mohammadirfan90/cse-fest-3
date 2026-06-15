"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { 
  FileDown, 
  Users, 
  Layers, 
  FileSpreadsheet, 
  CreditCard, 
  Trophy, 
  Send,
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileArchive,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom Toast System
interface ToastState {
  message: string;
  type: "success" | "error";
}

function Toast({ message, type, onClose }: ToastState & { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md max-w-md ${
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-400 dark:text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="text-sm font-medium leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-md hover:bg-neutral-800/10"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// Option Metadata for Export Card Selectors
const EXPORT_TYPES_CONFIG = [
  {
    id: "participants",
    title: "Participants",
    description: "Detailed participant profiles with emails, phone numbers, universities, semesters, and team details.",
    icon: Users,
    color: "from-blue-500/10 to-blue-500/20 border-blue-500/30 text-blue-500",
    badge: "Most Used",
  },
  {
    id: "all_teams",
    title: "Teams & Roster",
    description: "Teams grouped by segment showing leader contact info and members in adjacent columns (padded with NA).",
    icon: Layers,
    color: "from-violet-500/10 to-violet-500/20 border-violet-500/30 text-violet-500",
    badge: "Structured",
  },
  {
    id: "submissions",
    title: "Submissions",
    description: "Submission metadata, file links (PDFs/Google Docs), score values, status, and reviewer info.",
    icon: Send,
    color: "from-amber-500/10 to-amber-500/20 border-amber-500/30 text-amber-500",
  },
  {
    id: "payments",
    title: "Payments Log",
    description: "Full transaction record containing Bkash/Nagad transactions, amounts, verification status, and timestamps.",
    icon: CreditCard,
    color: "from-emerald-500/10 to-emerald-500/20 border-emerald-500/30 text-emerald-500",
  },
  {
    id: "rankings",
    title: "Leaderboard Rankings",
    description: "Active leaderboard rankings, total scores, final validation statuses, and public visibility options.",
    icon: Trophy,
    color: "from-rose-500/10 to-rose-500/20 border-rose-500/30 text-rose-500",
  },
  {
    id: "teams",
    title: "Teams Summary",
    description: "Lightweight overview of teams showing creation timestamps, leader emails, and active status summaries.",
    icon: FileSpreadsheet,
    color: "from-cyan-500/10 to-cyan-500/20 border-cyan-500/30 text-cyan-500",
  },
];

interface Competition {
  id: string;
  name: string;
}

export default function AdminExportsPage() {
  const [competitionId, setCompetitionId] = useState<string>("all");
  const [exportType, setExportType] = useState<string>("participants");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  
  // Preview Data
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);

  const supabase = React.useMemo(() => createClient(), []);

  // Fetch Competitions on Mount
  useEffect(() => {
    async function loadCompetitions() {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name")
        .order("name", { ascending: true });
        
      if (error) {
        setToastState({
          message: `Failed to load competitions: ${error.message}`,
          type: "error",
        });
      } else if (data) {
        setCompetitions(data);
      }
    }
    loadCompetitions();
  }, [supabase]);

  // Fetch Preview Meta whenever selection changes
  useEffect(() => {
    let active = true;
    async function getPreviewData() {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams({
          type: exportType,
          format: "json",
        });
        if (competitionId && competitionId !== "all") {
          params.append("competition_id", competitionId);
        }

        const resp = await fetch(`/api/admin/export?${params.toString()}`);
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.message ?? "Failed to load preview metadata");
        }
        
        const resJson = await resp.json();
        if (active && resJson.success && resJson.data) {
          setTotalRows(resJson.data.totalRows);
          setPreviewHeaders(resJson.data.headers);
          setPreviewRows(resJson.data.previewRows || []);
        }
      } catch {
        if (active) {
          setTotalRows(null);
          setPreviewHeaders([]);
          setPreviewRows([]);
        }
      } finally {
        if (active) setPreviewLoading(false);
      }
    }

    getPreviewData();
    return () => {
      active = false;
    };
  }, [exportType, competitionId]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: exportType,
        format: "csv",
      });
      if (competitionId && competitionId !== "all") {
        params.append("competition_id", competitionId);
      }

      const resp = await fetch(`/api/admin/export?${params.toString()}`);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message ?? "Export failed");
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      
      // Get filename from header or build fallback
      const contentDisposition = resp.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${exportType}_export_${Date.now()}.csv`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToastState({
        message: `Successfully downloaded "${filename}"`,
        type: "success",
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Failed to download export file.";
      setToastState({
        message: errMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-sans relative">
      <AnimatePresence>
        {toastState && (
          <Toast
            message={toastState.message}
            type={toastState.type}
            onClose={() => setToastState(null)}
          />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-sidebar-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
            <FileArchive className="h-7 w-7 text-primary" />
            <span>Data Export Center</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Download raw CSV records and analytics segments for the SMUCT CSE Fest 2026 platform.
          </p>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-sidebar border-sidebar-border overflow-hidden">
            <CardHeader className="border-b border-sidebar-border/40 pb-4">
              <CardTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-muted-foreground flex items-center gap-2">
                <span>1. Select Export Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORT_TYPES_CONFIG.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = exportType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setExportType(opt.id)}
                      className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group overflow-hidden ${
                        isSelected
                          ? "bg-sidebar-accent border-primary ring-1 ring-primary"
                          : "bg-background border-sidebar-border hover:border-sidebar-border/80 hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className={`p-2 rounded-md bg-gradient-to-br ${opt.color} mb-3 group-hover:scale-105 transition-transform duration-200`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {opt.badge && (
                          <span className="text-sm uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {opt.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Segment Filter Selection */}
          <Card className="bg-sidebar border-sidebar-border">
            <CardHeader className="border-b border-sidebar-border/40 pb-4">
              <CardTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-muted-foreground">
                2. Set Segment Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-mono">
                  Competition Filter
                </label>
                <Select value={competitionId} onValueChange={setCompetitionId}>
                  <SelectTrigger className="bg-background border-sidebar-border">
                    <SelectValue placeholder="All Competitions" />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border">
                    <SelectItem value="all">All Competitions (No filter)</SelectItem>
                    {competitions.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>Only reports support filtering (e.g. Participants or Submissions). Others will ignore filter.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Action */}
        <div className="space-y-6">
          <Card className="bg-sidebar border-sidebar-border h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div>
              <CardHeader className="border-b border-sidebar-border/40 pb-4">
                <CardTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-muted-foreground">
                  3. Export Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Meta Rows */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs py-1 border-b border-sidebar-border/30">
                    <span className="text-muted-foreground">Exporting Report:</span>
                    <span className="font-semibold text-foreground capitalize">
                      {EXPORT_TYPES_CONFIG.find(o => o.id === exportType)?.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-sidebar-border/30">
                    <span className="text-muted-foreground">Segment Scope:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]" title={competitionId === "all" ? "All Competitions" : competitions.find(c => c.id === competitionId)?.name}>
                      {competitionId === "all" ? "All Competitions" : competitions.find(c => c.id === competitionId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-sidebar-border/30">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-mono bg-neutral-900 border border-sidebar-border px-1.5 py-0.5 rounded text-sm text-primary">
                      CSV (.csv)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="text-muted-foreground">Total Rows (Est):</span>
                    {previewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="font-mono font-bold text-foreground text-sm">
                        {totalRows !== null ? totalRows : "—"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Headers preview if populated */}
                {previewHeaders.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-mono">
                      Export Columns
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {previewHeaders.map((header, idx) => (
                        <span key={idx} className="text-sm font-mono bg-background border border-sidebar-border px-2 py-0.5 rounded-md text-foreground">
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            <CardFooter className="p-6 border-t border-sidebar-border/40 bg-sidebar-accent/30">
              <Button
                onClick={handleDownload}
                disabled={loading || previewLoading || totalRows === 0}
                className="w-full flex items-center justify-center space-x-2 py-5 cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm rounded-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Preparing File...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Download CSV</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Row Previews Grid (if data rows exist) */}
      {previewRows.length > 0 && (
        <Card className="bg-sidebar border-sidebar-border overflow-hidden">
          <CardHeader className="border-b border-sidebar-border/40 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-wider uppercase font-mono text-muted-foreground">
                Export Live Preview (Top {previewRows.length} Rows)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sidebar-accent/50 border-b border-sidebar-border">
                    {previewHeaders.map((header, idx) => (
                      <th key={idx} className="p-3 text-xs font-mono font-bold text-muted-foreground border-r border-sidebar-border/30 last:border-r-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sidebar-border/30">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-sidebar-accent/20 transition-colors">
                      {row.map((cell: unknown, cIdx) => (
                        <td key={cIdx} className="p-3 text-xs font-sans text-foreground truncate max-w-[200px] border-r border-sidebar-border/20 last:border-r-0" title={String(cell)}>
                          {cell === null || cell === undefined || cell === "NA" ? (
                            <span className="text-muted-foreground italic text-sm">NA</span>
                          ) : typeof cell === "boolean" ? (
                            <span className={`px-1.5 py-0.5 rounded text-sm font-bold ${cell ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {cell ? 'TRUE' : 'FALSE'}
                            </span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
