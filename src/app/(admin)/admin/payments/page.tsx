"use client";

import * as React from "react";
import {
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Banknote,
  Plus,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentItem {
  id: string;
  team_id: string;
  competition_id: string;
  amount: number;
  transaction_id: string;
  screenshot_url: string;
  sender_number?: string | null;
  method: string;
  status: "pending" | "approved" | "rejected" | "resubmission_required";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  teams: {
    id: string;
    name: string;
  } | null;
  competitions: {
    id: string;
    name: string;
    type: string;
    entry_fee: number;
    is_fee_per_person?: boolean;
  } | null;
  team_score: number | null;
  team_rank: number | null;
  member_count?: number;
  leader_phone?: string | null;
  leader_university?: string | null;
}

interface PaymentGateway {
  id: string;
  name: string;
  display_name: string;
  number: string;
  instructions: string | null;
  active: boolean;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("pending");
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<"queue" | "config">("queue");

  // Payment methods configuration state
  const [methods, setMethods] = React.useState<PaymentGateway[]>([]);
  const [methodsLoading, setMethodsLoading] = React.useState(false);
  const [showMethodForm, setShowMethodForm] = React.useState(false);
  const [editingMethod, setEditingMethod] = React.useState<PaymentGateway | null>(null);
  const [methodFormData, setMethodFormData] = React.useState({
    id: "",
    name: "",
    display_name: "",
    number: "",
    instructions: "",
    active: true,
  });
  const [methodFormLoading, setMethodFormLoading] = React.useState(false);

  const [competitionFilter, setCompetitionFilter] = React.useState<string>("all");
  const [competitions, setCompetitions] = React.useState<{ id: string; name: string }[]>([]);

  // Note dialog state
  const [actioningPaymentId, setActioningPaymentId] = React.useState<string | null>(null);
  const [actionType, setActionType] = React.useState<"reject" | "resubmission_required" | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Load competitions on mount
  React.useEffect(() => {
    let active = true;
    async function loadComps() {
      try {
        const res = await fetch("/api/admin/competitions");
        const data = await res.json();
        if (data.success && active) {
          setCompetitions(data.data || []);
        }
      } catch {
        // Ignore fallback
      }
    }
    loadComps();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    async function loadPayments() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const url = new URL("/api/admin/payments", window.location.origin);
        if (statusFilter !== "all") {
          url.searchParams.set("status", statusFilter);
        }
        if (competitionFilter !== "all") {
          url.searchParams.set("competition_id", competitionFilter);
        }

        const res = await fetch(url.toString());
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (active) {
          setPayments(data.data || []);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load payments queue.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, [statusFilter, competitionFilter, refreshTrigger]);

  // Load payment methods configuration
  React.useEffect(() => {
    if (activeTab !== "config") return;
    let active = true;
    async function loadMethods() {
      setMethodsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/payment-methods");
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (active) {
          setMethods(data.data || []);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load payment methods.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setMethodsLoading(false);
        }
      }
    }
    loadMethods();
    return () => {
      active = false;
    };
  }, [activeTab, refreshTrigger]);

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setMethodFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        ...methodFormData,
        id: editingMethod?.id || undefined,
      };
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setSuccessMsg(data.message);
      setShowMethodForm(false);
      setEditingMethod(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save payment gateway.";
      setErrorMsg(errorMessage);
    } finally {
      setMethodFormLoading(false);
    }
  };

  const handleToggleActive = async (methodItem: PaymentGateway) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...methodItem,
          active: !methodItem.active,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to toggle gateway status.";
      setErrorMsg(errorMessage);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method? This might disrupt participants relying on it.")) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/payment-methods?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(data.message);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete payment gateway.";
      setErrorMsg(errorMessage);
    }
  };

  const handleEditMethodClick = (methodItem: PaymentGateway) => {
    setEditingMethod(methodItem);
    setMethodFormData({
      id: methodItem.id,
      name: methodItem.name,
      display_name: methodItem.display_name,
      number: methodItem.number,
      instructions: methodItem.instructions || "",
      active: methodItem.active,
    });
    setShowMethodForm(true);
  };

  const handleAddMethodClick = () => {
    setEditingMethod(null);
    setMethodFormData({
      id: "",
      name: "",
      display_name: "",
      number: "",
      instructions: "",
      active: true,
    });
    setShowMethodForm(true);
  };

  const handleApprove = async (paymentId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, status: "approved" }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to approve payment.");
      }
      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    }
  };

  const openActionDialog = (paymentId: string, type: "reject" | "resubmission_required") => {
    setActioningPaymentId(paymentId);
    setActionType(type);
    setReviewNotes("");
  };

  const closeActionDialog = () => {
    setActioningPaymentId(null);
    setActionType(null);
    setReviewNotes("");
  };

  const handleActionSubmit = async () => {
    if (!actioningPaymentId || !actionType) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const status = actionType === "reject" ? "rejected" : "resubmission_required";
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: actioningPaymentId,
          status,
          notes: reviewNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update transaction status.");
      }
      setSuccessMsg(data.message);
      closeActionDialog();
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFinal = async (paymentId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, status: "approved", confirm_final: true }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to confirm final selection.");
      }
      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    }
  };

  const handleDeclineFinal = async (paymentId: string) => {
    if (!confirm("Are you sure you want to decline this team from final selection? This will mark payment as rejected.")) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          status: "rejected",
          notes: "Declined from final selection",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to decline team from final selection.");
      }
      setSuccessMsg(data.message);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    }
  };

  // Search filter matching
  const filteredPayments = payments.filter((p) => {
    const txid = p.transaction_id?.toLowerCase() || "";
    const teamName = p.teams?.name?.toLowerCase() || "";
    const compName = p.competitions?.name?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();

    return txid.includes(search) || teamName.includes(search) || compName.includes(search);
  });

  const handleBulkExport = () => {
    try {
      const headers = [
        "Competition Name",
        "Team Name",
        "Sender Number",
        "Transaction ID",
        "Amount",
        "University Name",
        "Leader Number"
      ];

      const rows = filteredPayments.map((p) => [
        p.competitions?.name || "N/A",
        p.teams?.name || "N/A",
        p.sender_number || "N/A",
        p.transaction_id || "N/A",
        p.amount ?? "N/A",
        p.leader_university || "N/A",
        p.leader_phone || "N/A"
      ]);

      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(","),
        ...rows.map(row => 
          row.map(val => {
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `payments_export_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setErrorMsg("Failed to export CSV.");
      console.error(err);
    }
  };

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const totalRevenue = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 animate-fade-in"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4.5 w-4.5 text-neutral-550" />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-50 tracking-tight">Fee Payments Queue</h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Review bKash & Nagad payments submitted by teams and approve competition registrations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-sm font-mono bg-warning/10 border border-warning/20 text-warning px-3 py-1 rounded">
            <Clock className="h-3 w-3" />
            <span>{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono bg-success/10 border border-success/20 text-success px-3 py-1 rounded">
            <Check className="h-3 w-3" />
            <span>{totalRevenue.toLocaleString()} BDT collected</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)}><X className="h-3.5 w-3.5 hover:opacity-75" /></button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div key="success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2"
          >
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)}><X className="h-3.5 w-3.5 hover:opacity-75" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub navigation tabs */}
      <div className="flex gap-4 border-b border-neutral-800 pb-px">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-2.5 px-1 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer outline-none ${
            activeTab === "queue"
              ? "border-primary text-neutral-50 font-bold"
              : "border-transparent text-neutral-500 hover:text-neutral-350"
          }`}
        >
          Review Queue
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`pb-2.5 px-1 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer outline-none ${
            activeTab === "config"
              ? "border-primary text-neutral-50 font-bold"
              : "border-transparent text-neutral-500 hover:text-neutral-350"
          }`}
        >
          Gateway Configuration
        </button>
      </div>

      {activeTab === "queue" ? (
        <>
          {/* Search and Tab Filters */}
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Competition Selector Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Filter by Competition:</span>
                <select
                  value={competitionFilter}
                  onChange={(e) => setCompetitionFilter(e.target.value)}
                  className="flex h-9 rounded border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-200 focus:border-neutral-700 outline-none cursor-pointer"
                >
                  <option value="all">All Competitions</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-72 relative">
                <Input
                  placeholder="Search TXID, team, competition..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 h-9.5 text-xs bg-neutral-950 border-neutral-800/80 focus:border-neutral-700"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Pill Tabs */}
              <div className="flex items-center gap-1 bg-neutral-900/60 border border-neutral-850 rounded-lg p-1 flex-wrap backdrop-blur-md">
                {[
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "resubmission_required", label: "Resubmit" },
                  { value: "all", label: "All" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`py-1.5 px-3 text-xs font-semibold font-sans capitalize rounded-md transition-all duration-150 outline-none cursor-pointer ${
                      statusFilter === tab.value
                        ? "bg-neutral-800 text-neutral-50 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {tab.label}
                    {statusFilter === tab.value && (
                      <span className="ml-1.5 font-mono text-sm text-neutral-400">({filteredPayments.length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Bulk Export Button */}
              <Button
                variant="secondary"
                className="text-xs h-9 font-semibold gap-1.5 cursor-pointer hover:bg-neutral-800 transition-colors shrink-0"
                onClick={handleBulkExport}
                disabled={filteredPayments.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Payments CSV</span>
              </Button>
            </div>
          </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-neutral-800/20 rounded-lg border border-neutral-800/60 animate-pulse" />
          ))}
        </div>
      ) : filteredPayments.length > 0 ? (
        <div className="space-y-4">
          {filteredPayments.map((p, idx) => {
            const isPending = p.status === "pending";
            const baseFee = p.competitions?.is_fee_per_person
              ? (p.competitions?.entry_fee || 0) * (p.member_count || 1)
              : (p.competitions?.entry_fee || 0);
            const charge = baseFee <= 0 ? 0 : Math.ceil(baseFee / 500) * 10;
            const expectedFee = baseFee + charge;
            const amountMatches = p.amount === expectedFee;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card variant="glass" className="border-neutral-800/40 bg-neutral-900/10 hover:border-neutral-700/60 transition-all duration-150 p-5 rounded-lg overflow-hidden">
                  <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-5">
                      {/* Details */}
                      <div className="space-y-3 flex-1">
                        <div className="space-y-0.5">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-bold font-mono text-neutral-500 uppercase tracking-widest">
                              {p.competitions?.name}
                            </span>
                            <Badge
                              variant={
                                p.status === "approved" ? "success"
                                : p.status === "pending" ? "warning"
                                : "error"
                              }
                              className="capitalize text-sm py-0.5 rounded px-2 font-mono font-semibold"
                            >
                              {p.status.replace("_", " ")}
                            </Badge>
                            {!amountMatches && isPending && (
                              <Badge variant="error" className="flex items-center gap-1 text-sm font-mono py-0.5 rounded px-2 font-semibold">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Fee Mismatch (Expected {expectedFee} BDT)</span>
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-sm font-heading font-semibold text-neutral-100 mt-1">
                            Team: <span className="text-neutral-200 font-bold">{p.teams?.name || "N/A"}</span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                          <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-0.5">
                            <p className="text-neutral-600 text-sm uppercase tracking-widest font-mono">Transaction ID</p>
                            <p className="text-neutral-200 font-mono font-semibold">{p.transaction_id}</p>
                          </div>
                          <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-0.5">
                            <p className="text-neutral-600 text-sm uppercase tracking-widest font-mono">Sender Number</p>
                            <p className="text-neutral-200 font-mono font-semibold">{p.sender_number || "—"}</p>
                          </div>
                          <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-0.5">
                            <p className="text-neutral-600 text-sm uppercase tracking-widest font-mono">Amount</p>
                            <p className={`font-semibold font-mono ${amountMatches ? "text-neutral-200" : "text-error"}`}>
                              {p.amount} BDT
                            </p>
                            <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
                              {p.competitions?.is_fee_per_person ? (
                                <span>({p.competitions.entry_fee} BDT x {p.member_count || 1} + {charge} BDT charge)</span>
                              ) : (
                                <span>(Base: {baseFee} BDT + {charge} BDT charge)</span>
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-0.5">
                            <p className="text-neutral-600 text-sm uppercase tracking-widest font-mono">Method</p>
                            <p className="text-neutral-200 font-medium uppercase font-mono">{p.method}</p>
                          </div>
                        </div>
                      </div>



                      {/* Actions */}
                      {isPending ? (
                        <div className="flex md:flex-col gap-2 self-stretch md:self-start shrink-0">
                          <Button variant="success" onClick={() => handleApprove(p.id)} className="text-xs py-1.5 px-3.5 gap-1.5 rounded border border-success/20">
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button variant="secondary" onClick={() => openActionDialog(p.id, "resubmission_required")} className="text-xs py-1.5 px-3.5 gap-1.5 hover:border-warning hover:text-warning rounded border border-neutral-850">
                            <Clock className="h-3.5 w-3.5" />
                            Resubmit
                          </Button>
                          <Button variant="destructive" onClick={() => openActionDialog(p.id, "reject")} className="text-xs py-1.5 px-3.5 gap-1.5 rounded border border-error/20">
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      ) : p.status === "approved" ? (
                        <div className="flex md:flex-col gap-2 self-stretch md:self-start shrink-0">
                          <Button variant="success" onClick={() => handleConfirmFinal(p.id)} className="text-xs py-1.5 px-3.5 gap-1.5 rounded border border-success/20">
                            <Check className="h-3.5 w-3.5" />
                            Confirm Final
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeclineFinal(p.id)} className="text-xs py-1.5 px-3.5 gap-1.5 rounded border border-error/20">
                            <X className="h-3.5 w-3.5" />
                            Decline Final
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {/* Inline action dialog */}
                    {actioningPaymentId === p.id && actionType && (
                      <div className="border-t border-neutral-850 pt-4 space-y-3 font-sans">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                          <h4 className="text-xs font-semibold text-neutral-300">
                            {actionType === "reject" ? "Rejection Reason" : "Resubmission Instructions"}
                          </h4>
                        </div>
                        <textarea
                          rows={2}
                          placeholder={actionType === "reject" ? "Explain why this proof was rejected..." : "Describe what needs to be fixed..."}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="flex w-full rounded border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-neutral-50 focus:border-neutral-700 outline-none resize-none leading-relaxed transition-colors"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={closeActionDialog} className="text-xs py-1 px-3 hover:bg-neutral-900 rounded" disabled={actionLoading}>Cancel</Button>
                          <Button
                            variant={actionType === "reject" ? "destructive" : "primary"}
                            onClick={handleActionSubmit}
                            isLoading={actionLoading}
                            className={`text-xs py-1 px-4 rounded ${actionType === "resubmission_required" ? "bg-warning hover:bg-warning/90 border-warning/20 text-neutral-950" : ""}`}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-neutral-800/60 rounded-lg bg-neutral-900/10">
          <div className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-full w-fit mx-auto mb-4 text-neutral-500">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-semibold text-neutral-300 mb-1 text-sm">No Payments Found</h3>
          <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto leading-relaxed">
            No payment proofs match this filter.
          </p>
        </div>
      )}
    </>
  ) : (
        /* Configuration view tab */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 font-semibold">Active billing channels</h2>
            {!showMethodForm && (
              <Button variant="primary" onClick={handleAddMethodClick} className="gap-2 h-9 text-xs">
                <Plus className="h-4 w-4" />
                <span>Add Payment Method</span>
              </Button>
            )}
          </div>

          {/* Add/Edit Form Overlay */}
          {showMethodForm && (
            <Card variant="glass" className="bg-glass border-glass p-6 max-w-2xl animate-slide-down">
              <form onSubmit={handleSaveMethod} className="space-y-5">
                <h3 className="text-sm font-heading font-bold text-neutral-100 uppercase tracking-wide">
                  {editingMethod ? "Edit Gateway Details" : "Create New Gateway"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Display Name"
                    placeholder="e.g. bKash Personal, Rocket Merchant"
                    value={methodFormData.display_name}
                    onChange={(e) => setMethodFormData({ ...methodFormData, display_name: e.target.value })}
                    disabled={methodFormLoading}
                    required
                  />
                  <div>
                    <label className="text-sm font-medium text-neutral-300 font-sans block mb-1.5">Identifier (Lowercase, no spaces)</label>
                    <input
                      type="text"
                      placeholder="e.g. bkash, rocket_merchant"
                      value={methodFormData.name}
                      onChange={(e) => setMethodFormData({ ...methodFormData, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      disabled={methodFormLoading || !!editingMethod}
                      required
                      className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 outline-none transition-all font-mono"
                    />
                    <span className="text-sm text-neutral-500 mt-1 block">Used system-wide for transaction references.</span>
                  </div>
                </div>

                <Input
                  label="Account/Phone Number"
                  placeholder="e.g. +880 1999034829"
                  value={methodFormData.number}
                  onChange={(e) => setMethodFormData({ ...methodFormData, number: e.target.value })}
                  disabled={methodFormLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium text-neutral-300 font-sans">Instructions for Participants</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific guidelines, e.g. Send Money as Personal, Reference team name..."
                    value={methodFormData.instructions}
                    onChange={(e) => setMethodFormData({ ...methodFormData, instructions: e.target.value })}
                    disabled={methodFormLoading}
                    required
                    className="flex w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 outline-none transition-all"
                  />
                </div>

                <label className="relative flex items-center gap-3 p-3 rounded border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-mono uppercase tracking-wider text-neutral-350">
                  <input
                    type="checkbox"
                    checked={methodFormData.active}
                    onChange={(e) => setMethodFormData({ ...methodFormData, active: e.target.checked })}
                    disabled={methodFormLoading}
                    className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                  />
                  <span>Gateway is active (Visible to participants)</span>
                </label>

                <div className="flex gap-3 pt-2 justify-end">
                  <Button variant="ghost" type="button" onClick={() => setShowMethodForm(false)} disabled={methodFormLoading}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={methodFormLoading}>
                    {editingMethod ? "Update Gateway" : "Save Gateway"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {methodsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              <div className="h-44 bg-neutral-900 rounded-lg" />
              <div className="h-44 bg-neutral-900 rounded-lg" />
            </div>
          ) : methods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {methods.map((m) => (
                <Card key={m.id} variant="glass" className="bg-glass border-glass p-5 hover:border-neutral-700/60 transition-all flex flex-col justify-between gap-5 relative overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-heading font-bold text-neutral-100 text-base">{m.display_name}</h3>
                        <span className="text-sm font-mono text-neutral-500 uppercase tracking-widest">{m.name}</span>
                      </div>
                      <Badge variant={m.active ? "success" : "neutral"} className="capitalize font-mono text-xxs">
                        {m.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-lg font-sans space-y-1">
                      <span className="text-sm font-mono text-neutral-500 uppercase tracking-widest block">Account Number</span>
                      <strong className="text-neutral-200 font-mono text-sm">{m.number}</strong>
                    </div>

                    {m.instructions && (
                      <p className="text-xs text-neutral-400 font-sans leading-relaxed whitespace-pre-wrap">
                        {m.instructions}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-neutral-850/60 items-center justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleActive(m)}
                      className="text-xs py-1 px-3 border border-neutral-800 bg-neutral-900 hover:bg-neutral-850 text-neutral-350"
                    >
                      {m.active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleEditMethodClick(m)}
                      className="text-xs py-1 px-3 border border-neutral-800 bg-neutral-900 hover:bg-neutral-850 text-neutral-350 flex items-center gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteMethod(m.id)}
                      className="text-xs py-1 px-3 border border-error/20 flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-neutral-800 rounded-lg bg-neutral-900/10">
              <CreditCard className="h-10 w-10 text-neutral-700 mb-4 mx-auto" />
              <h3 className="font-heading font-semibold text-neutral-300 mb-1">No payment gateways configured</h3>
              <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto mb-4 leading-relaxed">
                Add payment methods like bkash or nagad to unlock participant submissions.
              </p>
              <Button variant="primary" onClick={handleAddMethodClick} className="text-xs">
                Configure Gateway Channel
              </Button>
            </div>
          )}
        </div>
      )}


    </motion.div>
  );
}

