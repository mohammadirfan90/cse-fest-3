"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  Video,
  ExternalLink,
  Crown,
  AlertCircle,
  Plus,
  LogOut,
  Mail,
  Phone,
  Bookmark,
  Clock,
  GraduationCap,
  CreditCard,
  Send,
  CheckCircle,
  Copy
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COMPETITION_IMAGES: Record<string, string> = {
  "e0bb66f8-45e0-4c12-a1f7-418f773b069d": "/software-showcase-logo.png",
  "318a4a58-89c0-449e-ba60-318df883ba58": "/iot-showcase-logo.png",
  "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa": "/idea-showcase-logo.png",
  "software-showcase": "/software-showcase-logo.png",
  "iot-showcase": "/iot-showcase-logo.png",
  "idea-showcase": "/idea-showcase-logo.png",
};
import { createClient } from "@/lib/supabase/client";
import RegistrationsList from "@/components/admin/RegistrationsList";

interface Member {
  id: string;
  role: string;
  invitation_status: string;
  user_id: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
    gender: string;
    university: string;
    department: string;
    semester: string;
    student_id: string;
    tshirt_size: string;
  };
}

interface Team {
  id: string;
  name: string;
  status: string;
  leader_id: string;
  competition_id: string;
  competitions: {
    id: string;
    name: string;
    type: string;
    min_members: number;
    max_members: number;
    eligibility: string;
    registration_end: string;
    submission_end: string;
    rulebook_url?: string | null;
    template_link?: string | null;
    description?: string | null;
    entry_fee?: number;
    is_fee_per_person?: boolean;
    submission_required?: boolean;
    preliminary_published?: boolean;
    final_published?: boolean;
    rounds_count?: number;
  } | null;
  members: Member[];
  submission?: DashboardSubmission | null; // loaded client-side per team
  payment?: DashboardPayment | null; // loaded client-side per team
}

interface DashboardSubmission {
  id: string;
  title: string;
  youtube_demo_url?: string | null;
  notes?: string | null;
  submitted_at: string;
}

interface DashboardPayment {
  id: string;
  amount: number;
  transaction_id: string;
  sender_number?: string | null;
  method: string;
  status: string;
  created_at: string;
}

interface DashboardCompetition {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  shortName?: string | null;
  teamSize?: string | null;
  shortDescription?: string | null;
  fee?: string | null;
  status?: string | null;
  rulebookUrl?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  number: string;
  instructions: string | null;
  active: boolean;
}

interface TeamPaymentFormProps {
  team: Team;
  bkashMethod: PaymentMethod | null;
  onSuccess: () => void;
}

function TeamPaymentForm({ team, bkashMethod, onSuccess }: TeamPaymentFormProps) {
  const [senderNumber, setSenderNumber] = React.useState("");
  const [transactionId, setTransactionId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const bkashNumber = bkashMethod?.number || "+880 1711-223344";
  const bkashDisplayName = bkashMethod?.display_name || "bKash";

  const comp = team.competitions;
  const acceptedMembers = team.members.filter((m) => m.invitation_status === "accepted").length || 1;
  const entryFee = comp?.entry_fee || 0;
  
  const baseFee = comp?.is_fee_per_person ? entryFee * acceptedMembers : entryFee;
  const bkashCharge = baseFee <= 0 ? 0 : Math.ceil(baseFee / 500) * 10;
  const totalAmount = baseFee + bkashCharge;

  const handleCopy = () => {
    navigator.clipboard.writeText(bkashNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanSender = senderNumber.trim();
    if (!/^\d{11}$/.test(cleanSender)) {
      setErrorMsg("Sender number must be exactly 11 digits (e.g. 017XXXXXXXX).");
      return;
    }

    const cleanTxId = transactionId.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(cleanTxId)) {
      setErrorMsg("Transaction ID must be exactly 10 uppercase alphanumeric characters without any special characters or symbols.");
      return;
    }
    if (!/[A-Z]/.test(cleanTxId) || !/[0-9]/.test(cleanTxId)) {
      setErrorMsg("Transaction ID must contain both uppercase letters and numbers (e.g., 6ICOTYGEYS).");
      return;
    }
    
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: team.id,
          amount: totalAmount,
          transaction_id: cleanTxId,
          method: "bkash",
          sender_number: cleanSender,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to submit payment details.");
      }

      setSuccessMsg("Payment details successfully submitted! Organizers will verify it shortly.");
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const payment = team.payment;

  if (payment?.status === "approved" || team.status === "finalist") {
    return (
      <div className="p-5 rounded-xl border border-success/20 bg-success/5 space-y-4">
        <div className="flex items-center gap-2 text-success font-heading font-bold text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Payment Verified & Selected</span>
        </div>
        <div className="text-xs text-neutral-400 space-y-1.5 font-mono">
          <div><span className="text-neutral-500">Method:</span> {bkashDisplayName}</div>
          <div><span className="text-neutral-500">Sender:</span> {payment?.sender_number || "Verified"}</div>
          <div><span className="text-neutral-500">TxID:</span> {payment?.transaction_id || "Verified"}</div>
          <div><span className="text-neutral-500">Amount Paid:</span> {payment?.amount || totalAmount} BDT</div>
        </div>
      </div>
    );
  }

  if (payment?.status === "pending") {
    return (
      <div className="p-5 rounded-xl border border-warning/20 bg-warning/5 space-y-4">
        <div className="flex items-center gap-2 text-warning font-heading font-bold text-sm">
          <Clock className="h-4 w-4 animate-pulse" />
          <span>Payment Review Pending</span>
        </div>
        <p className="text-xs text-neutral-400 font-sans leading-relaxed">
          Your payment is currently being reviewed by organizers. You will receive an in-app notification once verified.
        </p>
        <div className="text-xs text-neutral-400 space-y-1.5 font-mono border-t border-neutral-900 pt-3">
          <div><span className="text-neutral-500">Sender:</span> {payment.sender_number}</div>
          <div><span className="text-neutral-500">TxID:</span> {payment.transaction_id}</div>
          <div><span className="text-neutral-500">Amount:</span> {payment.amount} BDT</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-950/60 space-y-4">
      <div className="flex items-center gap-2 text-primary font-heading font-bold text-sm uppercase tracking-wider">
        <CreditCard className="h-4 w-4" />
        <span>{bkashDisplayName} Payment Form</span>
      </div>

      {payment?.status === "resubmission_required" && (
        <div className="p-3 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Resubmission Required:</span>
            Your previous payment proof was rejected by the reviewer. Please double check details and submit again.
          </div>
        </div>
      )}

      {entryFee <= 0 ? (
        <p className="text-xs text-neutral-500 font-sans">
          This competition has no entry fee. No payment required.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Amount Calculation */}
          <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-850 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Base Fee ({comp?.is_fee_per_person ? `${entryFee} BDT x ${acceptedMembers} member${acceptedMembers > 1 ? "s" : ""}` : "Flat Team Fee"}):</span>
              <span className="font-mono">{baseFee} BDT</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>{bkashDisplayName} Charge:</span>
              <span className="font-mono">+{bkashCharge} BDT</span>
            </div>
            <div className="flex justify-between text-neutral-100 font-bold border-t border-neutral-850 pt-2 text-sm">
              <span>Total Amount to Pay:</span>
              <span className="text-primary font-mono">{totalAmount} BDT</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-850 space-y-2">
            {bkashMethod?.instructions ? (
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed whitespace-pre-wrap">
                {bkashMethod.instructions}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                Please send the <strong>exact Total Amount</strong> above via "Send Money" to this {bkashDisplayName} Personal Number:
              </p>
            )}
            <div className="flex items-center justify-between gap-2 bg-neutral-950 p-2 rounded border border-neutral-850">
              <span className="font-mono font-bold text-neutral-250 select-all">{bkashNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                {copied ? <span className="text-[10px] text-success font-bold font-mono">Copied</span> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Form inputs */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                {bkashDisplayName} Sender Number
              </label>
              <input
                type="text"
                placeholder="e.g. 017XXXXXXXX"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-750 focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-2 text-xs font-mono outline-none text-neutral-200 placeholder-neutral-600 transition-colors"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                Transaction ID (TxID)
              </label>
              <input
                type="text"
                placeholder="e.g. A1B2C3D4E5"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-750 focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-2 text-xs font-mono outline-none text-neutral-200 placeholder-neutral-600 transition-colors"
                disabled={submitting}
              />
            </div>

            {errorMsg && (
              <div className="text-xxs text-error font-semibold flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-xxs text-success font-semibold flex items-center gap-1">
                <CheckCircle className="h-3 w-3 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5"
              disabled={submitting}
              isLoading={submitting}
            >
              <Send className="h-3 w-3" />
              <span>Submit Payment Proof</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string>("participant");
  const [activeTab, setActiveTab] = React.useState<"my_registrations" | "all_registrations">("my_registrations");
  const [allCompetitions, setAllCompetitions] = React.useState<DashboardCompetition[]>([]);
  const [bkashNumber, setBkashNumber] = React.useState("+880 1711-223344");
  const [bkashMethod, setBkashMethod] = React.useState<PaymentMethod | null>(null);

  const supabase = createClient();

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Authenticate
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Innovator");

      // Fetch user role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      const role = userData?.role || "participant";
      setUserRole(role);

      // Fetch teams and rosters
      const res = await fetch("/api/teams");
      const resData = await res.json();

      if (!resData.success) {
        throw new Error(resData.message || "Failed to load registrations.");
      }

      const activeTeams: Team[] = resData.data || [];

      // Fetch submissions and payments client-side for each team
      const teamsWithDetails = await Promise.all(
        activeTeams.map(async (team) => {
          let submission = null;
          let payment = null;
          try {
            const subRes = await fetch(`/api/submissions?team_id=${team.id}`);
            const subData = await subRes.json();
            submission = subData.success && subData.data ? subData.data : null;
          } catch (err) {
            console.error(`Failed to load submission for team ${team.id}:`, err);
          }
          try {
            const payRes = await fetch(`/api/payments?team_id=${team.id}`);
            const payData = await payRes.json();
            payment = payData.success && payData.data && payData.data.length > 0
              ? payData.data[0]
              : null;
          } catch (err) {
            console.error(`Failed to load payment for team ${team.id}:`, err);
          }
          return {
            ...team,
            submission,
            payment,
          };
        })
      );

      setTeams(teamsWithDetails);

      // Fetch all competitions
      const compRes = await fetch("/api/public/competitions");
      const compData = await compRes.json();
      if (compData.success) {
        setAllCompetitions(compData.data || []);
      }

      // Fetch dynamic bKash number
      try {
        const pmRes = await fetch("/api/payment-methods");
        const pmData = await pmRes.json();
        if (pmData.success && pmData.data) {
          const bkashMethodObj = pmData.data.find((m: any) => m.name === "bkash");
          if (bkashMethodObj) {
            setBkashNumber(bkashMethodObj.number);
            setBkashMethod(bkashMethodObj);
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic bKash number:", err);
      }
      } catch (err: unknown) {
        console.error("Dashboard error:", err);
        const errorMessage = err instanceof Error ? err.message : "An error occurred while loading dashboard data.";
        setErrorMsg(errorMessage);
      } finally {
        setLoading(false);
      }
  }, [supabase, router]);

  React.useEffect(() => {
    Promise.resolve().then(() => {
      loadData();
    });
  }, [loadData]);

  // Log out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const getTeamStatusBadge = (team: Team) => {
    const status = team.status;
    const comp = team.competitions;
    const finalPublished = comp?.final_published ?? false;

    if (!finalPublished) {
      if (status === "selected") {
        return (
          <Badge variant="warning" className="text-xxs font-mono font-bold tracking-wider py-0.5 px-2.5">
            Primary Selected / Payment Pending
          </Badge>
        );
      }
      if (status === "finalist") {
        return (
          <Badge variant="success" className="text-xxs font-mono font-bold tracking-wider py-0.5 px-2.5">
            Selected
          </Badge>
        );
      }
      return null;
    } else {
      if (status === "finalist") {
        return (
          <Badge variant="success" className="text-xxs font-mono font-bold tracking-wider py-0.5 px-2.5">
            Selected
          </Badge>
        );
      }
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xxs font-mono font-bold tracking-wider py-0.5 px-2.5">
          Not Selected
        </Badge>
      );
    }
  };

  const shouldShowStatusLabel = (team: Team) => {
    return !!team.competitions?.final_published || ["selected", "finalist"].includes(team.status);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse font-sans">
        <div className="flex justify-between items-end border-b border-neutral-900 pb-5">
          <div className="space-y-2">
            <div className="h-4 bg-neutral-900 w-24 rounded" />
            <div className="h-8 bg-neutral-900 w-64 rounded" />
          </div>
          <div className="h-10 bg-neutral-900 w-32 rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-6 bg-neutral-900 w-36 rounded" />
          <div className="h-64 bg-neutral-900/60 border border-neutral-850 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 font-sans select-text"
    >
      {/* Header Panel */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-neutral-900 pb-5"
      >
        <div>
          <span className="text-sm font-mono text-primary font-bold uppercase tracking-widest block mb-1">
            Participant Workspace
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-neutral-100 tracking-tight leading-none">
            Welcome back, <span className="text-primary">{userName?.split(" ")[0]}</span>
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1.5">
            Overview of your active registrations, team rosters, and submitted proposals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/competitions">
            <Button className="bg-primary hover:bg-primary/95 text-white font-sans text-base px-5 py-2.5 h-auto rounded-md hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] flex items-center gap-1.5 active:scale-[0.98] transition-all">
              <Plus className="h-4 w-4" />
              <span>Register New Team</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-base border border-neutral-850 hover:bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 py-2.5 px-4 h-auto rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </motion.div>

      {/* Global Notifications */}
      {errorMsg && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-semibold flex items-start gap-2.5"
        >
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Tab Switcher for coordinator role */}
      {userRole === "coordinator" && (
        <div className="flex border-b border-neutral-900 pb-px mb-6">
          <button
            onClick={() => setActiveTab("my_registrations")}
            className={`px-6 py-3 text-sm font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "my_registrations"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            My Registrations
          </button>
          <button
            onClick={() => setActiveTab("all_registrations")}
            className={`px-6 py-3 text-sm font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "all_registrations"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            All Team Registrations
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {userRole === "coordinator" && activeTab === "all_registrations" ? (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-heading font-extrabold text-neutral-100">All Team Registrations</h2>
          </div>
          <RegistrationsList />
        </motion.div>
      ) : (
        /* Main Registrations Section */
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-heading font-extrabold text-neutral-100">My Registrations</h2>
          </div>

        {teams.length > 0 ? (
          <div className="space-y-8">
            {teams.map((team, idx) => {
              const comp = team.competitions;
              const pdfUrl = team.submission ? `/api/submissions/file/${team.submission.id}?type=pdf` : null;
              const youtubeDemoUrl = team.submission?.youtube_demo_url || null;

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative group/card"
                >
                  <Card variant="glass" className="bg-glass border-glass overflow-hidden">
                    {/* Top Accent line based on status */}
                    <div className={`h-1.5 w-full ${
                      team.status === "selected" || team.status === "finalist"
                        ? "bg-success"
                        : team.status === "rejected"
                        ? "bg-error"
                        : "bg-primary"
                    }`} />

                    {/* Roster detail area */}
                    <div className="p-6 md:p-8 space-y-6">
                      {/* Competition Title */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="accent" className="text-sm uppercase font-mono font-bold tracking-wider px-2 py-0.5">
                              {comp?.type}
                            </Badge>
                            <span className="text-sm text-neutral-500 font-mono">
                              Roster limit: {comp?.min_members} - {comp?.max_members} members
                            </span>
                          </div>
                          <h3 className="text-lg font-heading font-extrabold text-neutral-100 uppercase tracking-tight">
                            {comp?.name}
                          </h3>
                          <p className="text-xs text-neutral-400 font-sans max-w-xl">
                            {comp?.description || "Exhibition competition details."}
                          </p>
                        </div>
                        {shouldShowStatusLabel(team) && (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-sm font-mono text-neutral-500 uppercase tracking-wider">Registration Status</span>
                            {getTeamStatusBadge(team)}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left/Middle: Team details and roster (2 cols) */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Team Name header */}
                          <div className="space-y-1 bg-neutral-950/40 p-4 border border-neutral-850 rounded-xl">
                            <span className="text-sm uppercase font-bold tracking-widest text-neutral-500 font-mono">Team Name</span>
                            <div className="text-sm font-semibold text-neutral-100 font-heading">
                              {team.name}
                            </div>
                          </div>

                          {/* Roster list */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-primary" />
                              <span>Roster Members</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {team.members.map((member) => {
                                const isLeaderRole = member.role === "leader";
                                return (
                                  <div
                                    key={member.id}
                                    className="p-4 rounded-xl border border-neutral-850 bg-neutral-950/60 relative overflow-hidden font-sans space-y-2.5 flex flex-col justify-between"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-neutral-200 truncate">
                                          {member.profiles.full_name}
                                        </span>
                                        {isLeaderRole ? (
                                          <Badge variant="primary" className="text-sm uppercase font-mono font-bold py-0.5 px-2 flex items-center gap-1 shrink-0">
                                            <Crown className="h-2 w-2" />
                                            <span>Leader</span>
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-sm uppercase font-mono font-bold py-0.5 px-2 shrink-0">
                                            Member
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-neutral-400 flex items-center gap-1.5">
                                        <Mail className="h-3 w-3 text-neutral-500 shrink-0" />
                                        <span className="truncate">{member.profiles.email}</span>
                                      </div>
                                      <div className="text-sm text-neutral-400 flex items-center gap-1.5">
                                        <Phone className="h-3 w-3 text-neutral-500 shrink-0" />
                                        <span>{member.profiles.phone}</span>
                                      </div>
                                    </div>

                                    <div className="border-t border-neutral-900 pt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-500 font-mono">
                                      <span className="flex items-center gap-0.5">
                                        <GraduationCap className="h-3 w-3 shrink-0" />
                                        {member.profiles.university}
                                      </span>
                                      <span>Dept: {member.profiles.department}</span>
                                      <span>Sem: {member.profiles.semester}</span>
                                      <span>ID: {member.profiles.student_id}</span>
                                      <span>T-shirt: {member.profiles.tshirt_size}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Right: Submission & Files (1 col) */}
                        <div className="space-y-6">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-accent" />
                            <span>Proposal Submission</span>
                          </h4>

                          {team.submission ? (
                            <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-950/60 space-y-4">
                              <div>
                                <span className="text-sm uppercase font-bold tracking-widest text-neutral-500 font-mono">Project Title</span>
                                <div className="text-xs font-semibold text-neutral-200 mt-1 leading-snug">
                                  {team.submission.title}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="text-sm uppercase font-bold tracking-widest text-neutral-500 font-mono block">Files Submitted</span>
                                
                                {pdfUrl && (
                                  <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-850 hover:border-neutral-700 transition-colors text-neutral-300 hover:text-neutral-100 text-xxs font-mono uppercase tracking-wider"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                                      <span>PDF Report</span>
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}

                                {youtubeDemoUrl && (
                                  <a
                                    href={youtubeDemoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-850 hover:border-neutral-700 transition-colors text-neutral-300 hover:text-neutral-100 text-xxs font-mono uppercase tracking-wider"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Video className="h-3.5 w-3.5 text-neutral-400" />
                                      <span>Demo Video</span>
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              {team.submission.notes && (
                                <div>
                                  <span className="text-sm uppercase font-bold tracking-widest text-neutral-500 font-mono">Submission Notes</span>
                                  <div className="text-sm text-neutral-400 mt-1 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto bg-neutral-950/40 p-2.5 rounded border border-neutral-850/50">
                                    {team.submission.notes}
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-neutral-900 pt-3 flex items-center gap-1 text-sm text-neutral-500 font-mono">
                                <Clock className="h-3 w-3" />
                                <span>Sent: {new Date(team.submission.submitted_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center border border-dashed border-neutral-850 rounded-xl bg-neutral-950/20 text-neutral-500 text-xs">
                              No project proposal submitted for this team.
                            </div>
                          )}

                          {comp?.entry_fee && comp.entry_fee > 0 && (
                            team.payment || (
                              (team.status === "selected" || team.status === "finalist") &&
                              (comp.rounds_count !== 2 || comp.preliminary_published)
                            )
                          ) && (
                            <div className="pt-4">
                              <TeamPaymentForm
                                team={team}
                                bkashMethod={bkashMethod}
                                onSuccess={loadData}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty state - Available Competitions cards catalog */
          <div className="space-y-6">
            <p className="text-sm text-neutral-400 font-sans">
              You haven&apos;t registered for any competitions yet. Browse the listings below and secure your team&apos;s spot:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {allCompetitions.map((comp) => {
                const coverImage =
                  comp.coverImageUrl ||
                  COMPETITION_IMAGES[comp.id] ||
                  (comp.shortName ? COMPETITION_IMAGES[comp.shortName.toLowerCase()] : "") ||
                  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";

                return (
                  <div
                    key={comp.id}
                    onClick={() => router.push(`/competitions/${comp.id}/register`)}
                    className="relative bg-neutral-900/40 rounded-xl flex flex-col group border border-neutral-850 transition-all duration-normal hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] overflow-hidden cursor-pointer"
                  >
                    {/* Cover image header */}
                    <div className="relative h-40 overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-t from-neutral-950/90 to-transparent z-10" />
                      <Image
                        src={coverImage}
                        alt={comp.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 380px"
                      />
                      <div className="absolute top-4 right-4 z-20">
                        <span className="bg-primary/20 backdrop-blur-md border border-primary/40 text-primary px-3 py-1 rounded-full text-sm font-bold font-sans">
                          {comp.teamSize?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 grow flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-heading font-extrabold text-base text-neutral-100 group-hover:text-primary transition-colors uppercase truncate">
                            {comp.name}
                          </h3>
                        </div>
                        <p className="text-neutral-400 text-xs line-clamp-3 leading-relaxed font-sans">
                          {comp.shortDescription}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-xs py-2 border-y border-neutral-850/65 font-mono">
                          <span className="text-neutral-500 font-bold uppercase">Entry Fee</span>
                          <span className="text-neutral-200 font-bold">{comp.fee}</span>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {comp.status === "registration_closed" ? (
                            <Button
                              disabled
                              className="grow bg-neutral-900 text-neutral-500 border border-neutral-850 py-2.5 h-auto rounded-md text-base font-bold font-sans cursor-not-allowed"
                            >
                              Registration Closed
                            </Button>
                          ) : (
                            <Link href={`/competitions/${comp.id}/register`} className="grow">
                              <Button className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 h-auto rounded-md text-base font-bold font-sans">
                                Register
                              </Button>
                            </Link>
                          )}
                          {comp.rulebookUrl && (
                            <a
                              href={comp.rulebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <Button
                                variant="secondary"
                                className="px-3 border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 py-2.5 h-auto rounded-md text-base"
                              >
                                Rulebook
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
      )}
    </motion.div>
  );
}
