"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  AlertCircle,
  Check,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface UserTeam {
  id: string;
  name: string;
  status: string;
  member_count?: number;
  competitions: {
    id: string;
    name: string;
    type: string;
    entry_fee: number;
    is_fee_per_person?: boolean;
    eligibility: string;
    payment_instructions: string | null;
    rounds_count: number;
    preliminary_published: boolean;
  } | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  transaction_id: string;
  screenshot_url: string;
  method: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  number: string;
  instructions: string | null;
  active: boolean;
}

export default function PaymentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [teams, setTeams] = React.useState<UserTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("");
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);

  // Form states
  const [method, setMethod] = React.useState<string>("");
  const [activeMethods, setActiveMethods] = React.useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = React.useState(true);
  const [transactionId, setTransactionId] = React.useState("");
  const [senderNumber, setSenderNumber] = React.useState("");
  const [formLoading, setFormLoading] = React.useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Clipboard feedback
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const supabase = createClient();

  // Fetch active payment methods
  React.useEffect(() => {
    let active = true;
    async function loadActiveMethods() {
      try {
        setMethodsLoading(true);
        const res = await fetch("/api/payment-methods");
        const data = await res.json();
        if (active) {
          if (data.success && data.data) {
            setActiveMethods(data.data);
            if (data.data.length > 0) {
              setMethod(data.data[0].name);
            }
          }
        }
      } catch {
        // Ignore or fallback
      } finally {
        if (active) {
          setMethodsLoading(false);
        }
      }
    }
    loadActiveMethods();
    return () => {
      active = false;
    };
  }, []);

  // Load user's teams
  React.useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Fetch team memberships
        const { data: memberships } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .eq("invitation_status", "accepted");

        if (memberships && memberships.length > 0) {
          const ids = memberships.map((m) => m.team_id);
          const { data: teamData, error } = await supabase
            .from("teams")
            .select(`
              id, 
              name, 
              status, 
              competitions(
                id, 
                name, 
                type, 
                entry_fee, 
                is_fee_per_person, 
                eligibility, 
                payment_instructions, 
                rounds_count, 
                preliminary_published
              ),
              team_members(id, invitation_status)
            `)
            .in("id", ids);

          if (error) throw error;
          const formattedTeams = (teamData || []).map((t) => {
            const acceptedMembers = t.team_members?.filter((m: any) => m.invitation_status === "accepted") || [];
            return {
              id: t.id,
              name: t.name,
              status: t.status,
              member_count: acceptedMembers.length || 1,
              competitions: t.competitions,
            };
          });
          setTeams(formattedTeams as unknown as UserTeam[]);

          if (formattedTeams.length > 0) {
            setSelectedTeamId(formattedTeams[0].id);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load team rosters.";
        setErrorMsg(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, [supabase]);

  // Load payment records for selected team
  React.useEffect(() => {
    let active = true;
    async function loadPayments() {
      if (!selectedTeamId) {
        await Promise.resolve();
        if (active) setPayments([]);
        return;
      }

      setPaymentsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/payments?team_id=${selectedTeamId}`);
        const data = await res.json();
        if (active) {
          if (data.success && data.data) {
            setPayments(data.data);
          } else {
            setPayments([]);
          }
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load payments.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setPaymentsLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, [selectedTeamId]);



  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    const activeTeam = teams.find((t) => t.id === selectedTeamId);
    if (!activeTeam || !activeTeam.competitions) return;

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

    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: selectedTeamId,
          amount: entryFee,
          transaction_id: cleanTxId,
          method,
          sender_number: cleanSender,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to submit payment proof.");
      }

      setSuccessMsg(data.message);
      setTransactionId("");
      setSenderNumber("");

      // Reload payments list
      const pRes = await fetch(`/api/payments?team_id=${selectedTeamId}`);
      const pData = await pRes.json();
      if (pData.success) {
        setPayments(pData.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-neutral-900 w-1/3 rounded-sm" />
        <div className="h-24 bg-neutral-900 w-full rounded-md" />
        <div className="h-64 bg-neutral-900 w-full rounded-md" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-neutral-800 rounded-md bg-neutral-900/10 space-y-4">
        <Users className="h-10 w-10 text-neutral-700 mx-auto" />
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="font-heading font-semibold text-sm text-neutral-300">No Roster Memberships</h3>
          <p className="text-xs text-neutral-500 font-sans leading-relaxed">
            You must join or create a team to view or submit registrations payments.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/teams">
            <Button variant="primary" className="text-xs">
              Go to Team Management
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeTeam = teams.find((t) => t.id === selectedTeamId);
  const comp = activeTeam?.competitions;
  const memberCount = activeTeam?.member_count || 1;
  const baseFee = comp?.is_fee_per_person
    ? (comp?.entry_fee || 0) * memberCount
    : (comp?.entry_fee || 0);
  const methodCharge = baseFee <= 0 ? 0 : Math.ceil(baseFee / 500) * 10;
  const entryFee = baseFee + methodCharge;

  // Find the latest payment record
  const latestPayment = payments.length > 0 ? payments[0] : null;

  // Business check: Can submit payment if:
  // 1. Entry fee is > 0
  // 2. And no payment exists yet OR the latest payment is rejected/resubmission requested
  // 3. And if 2-round competition: team status must be 'selected' (round 1 proposal accepted) OR team status is registered/finalist (resubmitting).
  // If it's a 1-round competition, they can pay directly.
  const isTwoRound = comp?.rounds_count === 2;
  const clearedFirstRound = activeTeam?.status === "selected" || activeTeam?.status === "registered" || activeTeam?.status === "finalist";
  const isPreliminaryPublished = comp?.preliminary_published ?? false;
  
  const paymentApproved = latestPayment?.status === "approved";
  const paymentPending = latestPayment?.status === "pending";

  const isEligibleToPay =
    entryFee > 0 &&
    (!latestPayment ||
      latestPayment.status === "rejected" ||
      latestPayment.status === "resubmission_required") &&
    (!isTwoRound || (isPreliminaryPublished && clearedFirstRound));

  const selectedMethodObj = activeMethods.find((m) => m.name === method);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-h3 font-heading font-bold text-neutral-50 tracking-tight">Registration Payments</h1>
        <p className="text-sm text-neutral-400 font-sans mt-1">
          Complete entry fee payments for your teams via bKash or Nagad securely.
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2.5">
          <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Payment Status and Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team selector card */}
          <Card variant="glass" className="bg-glass border-glass">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-sans">
                  Select Team to Review Payment
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="flex h-11 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700 transition-all duration-150 outline-none font-sans cursor-pointer"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.competitions?.name}) {"\u2014"} Status: {t.status}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Info */}
          {paymentsLoading ? (
            <div className="h-48 bg-neutral-900/40 rounded-xl animate-pulse border border-neutral-850" />
          ) : latestPayment ? (
            <Card
              variant="glass"
              className={
                latestPayment.status === "approved"
                  ? "border-success/20 bg-success/5"
                  : latestPayment.status === "pending"
                  ? "border-warning/20 bg-warning/5"
                  : "border-error/20 bg-error/5"
              }
            >
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-md font-heading font-semibold text-neutral-100">Latest Payment Transaction</CardTitle>
                <Badge
                  variant={
                    latestPayment.status === "approved"
                      ? "success"
                      : latestPayment.status === "pending"
                      ? "warning"
                      : "error"
                  }
                  className="capitalize font-mono"
                >
                  {latestPayment.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md space-y-4 font-sans">
                  <div>
                    <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider">
                      Transaction ID
                    </div>
                    <div className="text-sm text-neutral-200 font-mono font-bold mt-1 bg-neutral-950/60 py-1.5 px-2.5 rounded-lg border border-neutral-850 w-fit">
                      {latestPayment.transaction_id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider">
                      Method & Amount
                    </div>
                    <div className="text-sm text-neutral-200 font-semibold mt-1 uppercase">
                      {latestPayment.method} {"\u2014"} {latestPayment.amount} BDT
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider">
                      Submitted Date
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {new Date(latestPayment.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-neutral-800">
                    {latestPayment.status === "approved" ? (
                      <div className="flex items-center gap-2.5 text-xs text-success font-semibold">
                        <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                        <span>Your registration fee has been verified. Welcome to CSE Fest 2026!</span>
                      </div>
                    ) : latestPayment.status === "pending" ? (
                      <div className="flex items-center gap-2.5 text-xs text-warning font-semibold">
                        <Clock className="h-4.5 w-4.5 shrink-0 animate-pulse" />
                        <span>Manual verification in progress. Usually takes up to 24 hours.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-xs text-error font-semibold">
                        <XCircle className="h-4.5 w-4.5 shrink-0" />
                        <span>Verification failed. Please review instructions and resubmit below.</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Form to submit payment */}
          {isEligibleToPay && (
            <Card variant="glass" className="bg-glass border-glass">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2.5 font-heading">
                  <CreditCard className="h-5 w-5 text-accent" />
                  <span>Submit Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Select Payment Method */}
                  <div className="space-y-2 font-sans">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Payment Gateway</label>
                    {methodsLoading ? (
                      <div className="h-14 bg-neutral-900/40 rounded-xl animate-pulse" />
                    ) : activeMethods.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {activeMethods.map((m) => {
                          const isSelected = method === m.name;
                          // Dynamic custom style references for popular branding
                          const isBkash = m.name === "bkash";
                          const isNagad = m.name === "nagad";
                          const brandColorClass = isSelected
                            ? isBkash
                              ? "bg-[#E2125D]/10 border-[#E2125D] text-neutral-100 shadow-[0_0_15px_rgba(226,18,93,0.15)]"
                              : isNagad
                              ? "bg-[#F57C20]/10 border-[#F57C20] text-neutral-100 shadow-[0_0_15px_rgba(245,124,32,0.15)]"
                              : "bg-primary/10 border-primary text-neutral-100 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                            : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-neutral-700";

                          const dotColorClass = isSelected
                            ? isBkash
                              ? "border-[#E2125D]"
                              : isNagad
                              ? "border-[#F57C20]"
                              : "border-primary"
                            : "border-neutral-700";

                          const dotBgClass = isBkash
                            ? "bg-[#E2125D]"
                            : isNagad
                            ? "bg-[#F57C20]"
                            : "bg-primary";

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMethod(m.name)}
                              className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-normal hover:scale-[1.01] hover:shadow-level-1 cursor-pointer ${brandColorClass}`}
                            >
                              <span>{m.display_name}</span>
                              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${dotColorClass}`}>
                                {isSelected && <div className={`h-2 w-2 rounded-full ${dotBgClass}`} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded border border-warning/20 bg-warning/5 text-xs text-warning font-sans">
                        No active billing gateway channels are configured. Please contact organizers.
                      </div>
                    )}
                  </div>

                  {/* Required Registration Fee */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300 font-sans">
                      Required Registration Fee
                    </label>
                    <div className="h-10 flex items-center bg-neutral-950 border border-neutral-800 px-3.5 rounded-lg text-neutral-100 font-mono font-bold text-sm">
                      {comp?.is_fee_per_person ? (
                        <span>{comp.entry_fee} BDT x {memberCount} member{memberCount > 1 ? "s" : ""} (+ {methodCharge} BDT gateway charge) = {entryFee} BDT</span>
                      ) : (
                        <span>{baseFee} BDT (+ {methodCharge} BDT gateway charge) = {entryFee} BDT</span>
                      )}
                    </div>
                  </div>

                  {/* Sender Number & Transaction ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={`${selectedMethodObj?.display_name || "bKash/Nagad"} Sender Number`}
                      placeholder="e.g. 017XXXXXXXX"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      required
                      disabled={formLoading}
                    />
                    <Input
                      label="Transaction ID (TXID)"
                      placeholder="e.g. A1B2C3D4E5"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                      required
                      disabled={formLoading}
                    />
                  </div>



                  <Button variant="primary" type="submit" isLoading={formLoading} className="w-full gap-2 justify-center shadow-level-2 py-3 active:scale-[0.99]">
                    <Send className="h-4.5 w-4.5" />
                    <span>Submit Payment Proof</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Conditional state messages */}
          {!isEligibleToPay && entryFee > 0 && (
            <Card variant="glass" className="bg-glass border-glass">
              <CardContent className="p-6 flex items-start gap-3.5">
                <AlertCircle className="h-5.5 w-5.5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1 font-sans text-xs">
                  <h4 className="font-semibold text-neutral-200">Payment Window Inactive</h4>
                  <p className="text-neutral-500 leading-relaxed mt-0.5">
                    {paymentApproved
                      ? "Your payment is verified and registration is fully complete."
                      : paymentPending
                      ? "A payment submission is currently under review by organisers. You will be notified if a resubmission is required."
                      : isTwoRound && !isPreliminaryPublished
                      ? "Payment will be enabled once organizers announce and publish the preliminary selection results. You will be notified when your team is selected."
                      : isTwoRound && !clearedFirstRound
                      ? "For this 2-round competition, your team must be selected in the preliminary results before the payment window opens."
                      : "Payment options are currently locked or inactive for this team configuration."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {entryFee <= 0 && (
            <Card variant="glass" className="border-success/20 bg-success/5">
              <CardContent className="p-6 flex items-start gap-3.5">
                <CheckCircle className="h-5.5 w-5.5 text-success shrink-0 mt-0.5" />
                <div className="space-y-1 font-sans text-xs">
                  <h4 className="font-semibold text-success">Free Competition</h4>
                  <p className="text-neutral-400 leading-relaxed mt-0.5">
                    This competition has no registration fees. Registration is completed automatically upon team confirmation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Payment numbers & coordinates */}
        <div className="space-y-6">
          <h2 className="text-lg font-heading font-semibold text-neutral-200">Payment Instructions</h2>
          <Card variant="glass" className="bg-glass border-glass">
            <CardContent className="p-6 space-y-5 font-sans text-xs">
              <div className="space-y-2.5 pb-4 border-b border-neutral-800">
                <h3 className="font-semibold text-neutral-300 text-sm">Selected Billing Channel</h3>
                {selectedMethodObj ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between bg-neutral-950/60 p-3.5 rounded-lg border border-neutral-850/80 hover:border-neutral-700 transition-colors">
                      <div className="flex flex-col">
                        <span className={`font-bold text-xs ${
                          selectedMethodObj.name === "bkash" ? "text-[#E2125D]" :
                          selectedMethodObj.name === "nagad" ? "text-[#F57C20]" :
                          "text-primary"
                        }`}>
                          {selectedMethodObj.display_name}
                        </span>
                        <span className="text-neutral-300 font-mono font-semibold mt-1 text-sm">
                          {selectedMethodObj.number}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleCopy(selectedMethodObj.number, selectedMethodObj.name)}
                        className="h-8 px-3 text-sm font-semibold active:scale-95"
                      >
                        {copiedText === selectedMethodObj.name ? (
                          <span className="flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" /> Copied</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-500 italic mt-2">Please select a gateway channel to view details.</p>
                )}
              </div>

              {selectedMethodObj?.instructions ? (
                <div className="space-y-3 leading-relaxed text-neutral-400 bg-neutral-950/20 p-3.5 rounded-lg border border-neutral-850/40">
                  <h4 className="font-semibold text-neutral-350">Transaction Guide:</h4>
                  <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">
                    {selectedMethodObj.instructions}
                  </p>
                  <div className="pt-2.5 border-t border-neutral-850/40 font-mono text-sm text-neutral-500">
                    {comp?.is_fee_per_person ? (
                      <div>
                        Send fee: <strong className="text-neutral-300">{comp.entry_fee} BDT</strong> x <strong className="text-neutral-300">{memberCount} member{memberCount > 1 ? "s" : ""}</strong> = <strong className="text-neutral-200">{entryFee} BDT</strong>
                      </div>
                    ) : (
                      <div>
                        Send exact fee: <strong className="text-neutral-300">{entryFee} BDT</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 leading-relaxed text-neutral-400">
                  <h4 className="font-semibold text-neutral-350">Step-by-Step Guide:</h4>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Send the exact entry fee amount (
                      {comp?.is_fee_per_person ? (
                        <span className="text-neutral-200 font-bold font-mono">
                          {comp.entry_fee} BDT x {memberCount} member{memberCount > 1 ? "s" : ""} = {entryFee} BDT
                        </span>
                      ) : (
                        <span className="text-neutral-200 font-bold font-mono">{entryFee} BDT</span>
                      )}
                    ) to the selected account number above.</li>
                    <li>Use your <span className="text-neutral-200 font-mono font-semibold">Team Name</span> as reference.</li>
                    <li>Copy the <span className="text-neutral-200 font-bold font-mono">Transaction ID (TXID)</span> from the SMS confirmation.</li>
                    <li>Take a screenshot of the confirmation statement as proof.</li>
                    <li>Fill out the form and submit.</li>
                  </ol>
                </div>
              )}

              {comp?.payment_instructions && (
                <div className="pt-4 border-t border-neutral-800 space-y-2.5">
                  <h4 className="font-semibold text-neutral-300">Organiser Note:</h4>
                  <p className="text-neutral-400 whitespace-pre-wrap leading-relaxed">
                    {comp.payment_instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

