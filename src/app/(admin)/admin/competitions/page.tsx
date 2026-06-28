"use client";

import * as React from "react";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Competition = {
  id?: string;
  name: string;
  type: "Showcase" | "Programming" | "Security" | "Robotics" | "Esports" | "Custom";
  description: string;
  short_description: string;
  cover_image_url: string;
  banner_image_url: string;
  eligibility: "internal" | "external" | "both";
  solo_allowed: boolean;
  team_allowed: boolean;
  min_members: number;
  max_members: number;
  registration_start: string;
  registration_end: string;
  submission_start: string;
  submission_end: string;
  entry_fee: number;
  is_fee_per_person?: boolean;
  payment_instructions: string;
  rulebook_url: string;
  prize_pool: string;
  champion_prize: string;
  runner_up_prize: string;
  status: "draft" | "published" | "registration_open" | "registration_closed" | "archived";
  show_in_hero?: boolean;
  short_name?: string;
  hero_capacity?: number;
  rounds_count?: number;
};

const defaultCompState: Competition = {
  name: "",
  type: "Custom",
  description: "",
  short_description: "",
  cover_image_url: "",
  banner_image_url: "",
  eligibility: "both",
  solo_allowed: true,
  team_allowed: true,
  min_members: 1,
  max_members: 4,
  registration_start: "",
  registration_end: "",
  submission_start: "",
  submission_end: "",
  entry_fee: 0,
  is_fee_per_person: false,
  payment_instructions: "",
  rulebook_url: "",
  prize_pool: "",
  champion_prize: "",
  runner_up_prize: "",
  status: "draft",
  show_in_hero: false,
  short_name: "",
  hero_capacity: 80,
  rounds_count: 1,
};

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formLoading, setFormLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Form display toggle
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState<Competition>(defaultCompState);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = React.useState<Competition | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function loadCompetitions() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/competitions");
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (active) {
          setCompetitions(data.data || []);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load competitions.";
          setErrorMsg(errorMessage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadCompetitions();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const handleEdit = (comp: Competition) => {
    // Format ISO date strings for input type datetime-local (YYYY-MM-DDTHH:MM)
    const formatDateForInput = (isoString: string) => {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      } catch {
        return "";
      }
    };

    setFormData({
      ...comp,
      description: comp.description || "",
      short_description: comp.short_description || "",
      cover_image_url: comp.cover_image_url || "",
      banner_image_url: comp.banner_image_url || "",
      payment_instructions: comp.payment_instructions || "",
      rulebook_url: comp.rulebook_url || "",
      prize_pool: comp.prize_pool || "",
      champion_prize: comp.champion_prize || "",
      runner_up_prize: comp.runner_up_prize || "",
      registration_start: formatDateForInput(comp.registration_start),
      registration_end: formatDateForInput(comp.registration_end),
      submission_start: formatDateForInput(comp.submission_start),
      submission_end: formatDateForInput(comp.submission_end),
      show_in_hero: comp.show_in_hero ?? false,
      short_name: comp.short_name || "",
      hero_capacity: comp.hero_capacity ?? 80,
      rounds_count: comp.rounds_count ?? 1,
      is_fee_per_person: comp.is_fee_per_person ?? false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateNew = () => {
    setFormData(defaultCompState);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Convert HTML dates to complete ISO strings
      const payload = {
        ...formData,
        registration_start: new Date(formData.registration_start).toISOString(),
        registration_end: new Date(formData.registration_end).toISOString(),
        submission_start: new Date(formData.submission_start).toISOString(),
        submission_end: new Date(formData.submission_end).toISOString(),
        entry_fee: Number(formData.entry_fee),
        min_members: Number(formData.min_members),
        max_members: Number(formData.max_members),
        show_in_hero: Boolean(formData.show_in_hero),
        short_name: formData.short_name || "",
        hero_capacity: Number(formData.hero_capacity ?? 80),
        rounds_count: Number(formData.rounds_count ?? 1),
      };

      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setShowForm(false);
      setFormData(defaultCompState);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit competition.";
      setErrorMsg(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm?.id) return;
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/competitions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competition_id: deleteConfirm.id }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setDeleteConfirm(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete competition.";
      setErrorMsg(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-h3 font-heading font-bold text-neutral-50">Competition Builder</h1>
          <p className="text-sm text-neutral-400 font-sans mt-1">
            Create, configure, publish, and edit festival competitions.
          </p>
        </div>
        <div>
          {!showForm ? (
            <Button variant="primary" onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4.5 w-4.5" />
              <span>Create Competition</span>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Back to Catalog
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-sm bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-sm bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2">
          <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main layout views */}
      {showForm ? (
        <div className="space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Section 1: Basic Information */}
            <Card variant="glass" className="bg-glass border-glass p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-mono font-bold">1</span>
                  <span>Basic Information & Media</span>
                </CardTitle>
                <CardDescription className="text-xxs text-neutral-500 mt-1">
                  Define the core identity, descriptions, and media assets of the competition.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Competition Name"
                    placeholder="e.g. Speed Programming Contest"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={formLoading}
                    required
                  />
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-medium text-neutral-300 font-sans select-none">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Competition["type"] })}
                      disabled={formLoading}
                      required
                      className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    >
                      {["Showcase", "Programming", "Security", "Robotics", "Esports", "Custom"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Short Description"
                  placeholder="Quick summary snippet displayed on public catalog cards..."
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  disabled={formLoading}
                  required
                />

                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium text-neutral-300 font-sans">Full Description</label>
                  <textarea
                    rows={4}
                    placeholder="Provide full rule descriptions, parameters, details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={formLoading}
                    required
                    className="flex w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Cover Image URL"
                    placeholder="https://example.com/cover.png"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    disabled={formLoading}
                  />
                  <Input
                    label="Banner Image URL"
                    placeholder="https://example.com/banner.png"
                    value={formData.banner_image_url || ""}
                    onChange={(e) => setFormData({ ...formData, banner_image_url: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Participation Details & Finances */}
            <Card variant="glass" className="bg-glass border-glass p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-mono font-bold">2</span>
                  <span>Participation Parameters & Finances</span>
                </CardTitle>
                <CardDescription className="text-xxs text-neutral-500 mt-1">
                  Establish eligibility criteria, team sizes, registration fees, and prize structures.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-medium text-neutral-300 font-sans select-none">Eligibility</label>
                    <select
                      value={formData.eligibility}
                      onChange={(e) => setFormData({ ...formData, eligibility: e.target.value as Competition["eligibility"] })}
                      disabled={formLoading}
                      required
                      className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    >
                      <option value="both">Both (Internal & External)</option>
                      <option value="internal">Internal (SMUCT only)</option>
                      <option value="external">External only</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Entry Fee (BDT)"
                      type="number"
                      min="0"
                      value={formData.entry_fee}
                      onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) || 0 })}
                      disabled={formLoading}
                      required
                    />
                    <div className="flex flex-col space-y-1.5 justify-end pb-1">
                      <label className="relative flex items-center gap-3 p-3 rounded border border-neutral-850 bg-neutral-950/40 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-mono uppercase tracking-wider text-neutral-350">
                        <input
                          type="checkbox"
                          checked={formData.is_fee_per_person || false}
                          onChange={(e) => setFormData({ ...formData, is_fee_per_person: e.target.checked })}
                          disabled={formLoading}
                          className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                        />
                        <span>Fee is Per-Person</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-medium text-neutral-300 font-sans select-none">Rounds Count</label>
                    <select
                      value={formData.rounds_count || 1}
                      onChange={(e) => setFormData({ ...formData, rounds_count: parseInt(e.target.value) || 1 })}
                      disabled={formLoading}
                      required
                      className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    >
                      <option value={1}>1 Round (Direct Pay)</option>
                      <option value={2}>2 Rounds (Review First, Pay After)</option>
                    </select>
                  </div>
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-medium text-neutral-300 font-sans select-none">Publish Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Competition["status"] })}
                      disabled={formLoading}
                      required
                      className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published (Listed on catalog)</option>
                      <option value="registration_open">Registration Open</option>
                      <option value="registration_closed">Registration Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input
                    label="Total Prize Pool"
                    placeholder="e.g. 50,000 BDT"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                    disabled={formLoading}
                  />
                  <Input
                    label="Champion Prize"
                    placeholder="e.g. 25,000 BDT + Crest"
                    value={formData.champion_prize}
                    onChange={(e) => setFormData({ ...formData, champion_prize: e.target.value })}
                    disabled={formLoading}
                  />
                  <Input
                    label="Runner-up Prize"
                    placeholder="e.g. 15,000 BDT + Crest"
                    value={formData.runner_up_prize}
                    onChange={(e) => setFormData({ ...formData, runner_up_prize: e.target.value })}
                    disabled={formLoading}
                  />
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-4">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Team Formation Limits</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
                    <Input
                      label="Min Team Members"
                      type="number"
                      min="1"
                      value={formData.min_members}
                      onChange={(e) => setFormData({ ...formData, min_members: parseInt(e.target.value) || 1 })}
                      disabled={formLoading}
                      required
                    />
                    <Input
                      label="Max Team Members"
                      type="number"
                      min="1"
                      value={formData.max_members}
                      onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) || 1 })}
                      disabled={formLoading}
                      required
                    />
                     <label className="relative flex items-center gap-3 p-3 rounded border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-mono uppercase tracking-wider text-neutral-350">
                      <input
                        type="checkbox"
                        checked={formData.solo_allowed}
                        onChange={(e) => setFormData({ ...formData, solo_allowed: e.target.checked })}
                        disabled={formLoading}
                        className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                      />
                      <span>Solo Allowed</span>
                    </label>
                    <label className="relative flex items-center gap-3 p-3 rounded border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-mono uppercase tracking-wider text-neutral-350">
                      <input
                        type="checkbox"
                        checked={formData.team_allowed}
                        onChange={(e) => setFormData({ ...formData, team_allowed: e.target.checked })}
                        disabled={formLoading}
                        className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                      />
                      <span>Teams Allowed</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Timelines & Payment Info */}
            <Card variant="glass" className="bg-glass border-glass p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-mono font-bold">3</span>
                  <span>Timelines & Instruction Guides</span>
                </CardTitle>
                <CardDescription className="text-xxs text-neutral-500 mt-1">
                  Configure scheduling milestones, rulebook links, and specific bKash/Nagad billing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Registration Start Date"
                    type="datetime-local"
                    value={formData.registration_start}
                    onChange={(e) => setFormData({ ...formData, registration_start: e.target.value })}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Registration End Date"
                    type="datetime-local"
                    value={formData.registration_end}
                    onChange={(e) => setFormData({ ...formData, registration_end: e.target.value })}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Submission Start Date"
                    type="datetime-local"
                    value={formData.submission_start}
                    onChange={(e) => setFormData({ ...formData, submission_start: e.target.value })}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Submission End Date"
                    type="datetime-local"
                    value={formData.submission_end}
                    onChange={(e) => setFormData({ ...formData, submission_end: e.target.value })}
                    disabled={formLoading}
                    required
                  />
                </div>

                <Input
                  label="Rulebook Document URL"
                  placeholder="https://drive.google.com/rulebook.pdf"
                  value={formData.rulebook_url}
                  onChange={(e) => setFormData({ ...formData, rulebook_url: e.target.value })}
                  disabled={formLoading}
                />

                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium text-neutral-300 font-sans">Payment Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="bKash/Nagad Merchant Number details, instruction details..."
                    value={formData.payment_instructions}
                    onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                    disabled={formLoading}
                    className="flex w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Hero Section & Telemetry Display Config */}
            <Card variant="glass" className="bg-glass border-glass p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-mono font-bold">4</span>
                  <span>Hero Section & Telemetry Display Config</span>
                </CardTitle>
                <CardDescription className="text-xxs text-neutral-500 mt-1">
                  Configure settings specifically for displaying this competition in the home page hero rotator.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
                  <label className="relative flex items-center gap-3 p-3 rounded border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-mono uppercase tracking-wider text-neutral-350">
                    <input
                      type="checkbox"
                      checked={formData.show_in_hero || false}
                      onChange={(e) => setFormData({ ...formData, show_in_hero: e.target.checked })}
                      disabled={formLoading}
                      className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                    />
                    <span>Show in Hero Rotator</span>
                  </label>
                  <Input
                    label="Hero Abbreviation (3-4 Chars)"
                    placeholder="e.g. SOFT, IoT, CP"
                    maxLength={10}
                    value={formData.short_name || ""}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    disabled={formLoading}
                  />
                  <Input
                    label="Telemetry Filled Percentage (%)"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 80"
                    value={formData.hero_capacity ?? 80}
                    onChange={(e) => setFormData({ ...formData, hero_capacity: parseInt(e.target.value) || 0 })}
                    disabled={formLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Triggers */}
            <div className="flex gap-4 pt-2 justify-end">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)} disabled={formLoading} className="active:scale-[0.98]">
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={formLoading} className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent text-xs font-mono uppercase tracking-wider py-2 px-5 active:scale-[0.98] rounded cursor-pointer">
                {formData.id ? "Update Competition Parameters" : "Create Competition Record"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* Catalog list */
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-neutral-900 rounded-md" />
              ))}
            </div>
          ) : competitions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {competitions.map((comp) => (
                <Card
                  key={comp.id}
                  variant="glass"
                  hoverable
                  className="bg-glass border-glass p-6 flex flex-col justify-between gap-5 relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-xxs font-semibold font-mono text-neutral-400 uppercase tracking-widest">
                          {comp.type}
                        </span>
                        <h3 className="font-heading font-bold text-base text-neutral-100 group-hover:text-neutral-50 transition-colors">
                          {comp.name}
                        </h3>
                      </div>
                      <Badge
                        variant={
                          comp.status === "registration_open"
                            ? "success"
                            : comp.status === "draft"
                            ? "neutral"
                            : comp.status === "published"
                            ? "primary"
                            : "warning"
                        }
                        className="capitalize shrink-0 font-mono text-xxs"
                      >
                        {comp.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-xs text-neutral-400 font-sans line-clamp-2 leading-relaxed">
                      {comp.short_description || comp.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3.5 pt-3.5 text-xxs font-sans text-neutral-405 border-t border-neutral-800/40">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span>Size: <span className="font-semibold text-neutral-200 font-mono">{comp.min_members}-{comp.max_members}</span> devs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span>Fee: <span className="font-semibold text-neutral-200 font-mono">{comp.entry_fee} BDT{comp.is_fee_per_person ? " / person" : ""}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span className="capitalize">Target: <span className="font-semibold text-neutral-200 font-mono">{comp.eligibility}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-neutral-500 shrink-0" />
                        <span>Rounds: <span className="font-semibold text-neutral-200 font-mono">{comp.rounds_count ?? 1} Round(s)</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-neutral-850/60 items-center">
                    <Button
                      variant="secondary"
                      onClick={() => handleEdit(comp)}
                      className="text-xs py-2 px-3.5 flex items-center gap-1.5 grow justify-center font-semibold bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit Configuration</span>
                    </Button>
                    {comp.rulebook_url && (
                      <a
                        href={comp.rulebook_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        <Button
                          variant="ghost"
                          className="p-2.5 h-9 w-9 rounded-lg border border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700 flex items-center justify-center transition-colors"
                          aria-label="View rulebook"
                        >
                          <Eye className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setDeleteConfirm(comp)}
                      className="p-2.5 h-9 w-9 rounded-lg border border-neutral-800 hover:bg-error/10 hover:border-error/30 flex items-center justify-center transition-colors shrink-0"
                      aria-label="Delete competition"
                    >
                      <Trash2 className="h-4 w-4 text-neutral-500 hover:text-error transition-colors" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-neutral-800 rounded-lg bg-neutral-900/10">
              <Trophy className="h-10 w-10 text-neutral-700 mb-4 mx-auto" />
              <h3 className="font-heading font-semibold text-neutral-300 mb-1">No Competitions Created</h3>
              <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto mb-4">
                Get started by creating your first festival competition.
              </p>
              <Button variant="primary" onClick={handleCreateNew} className="text-xs">
                Create First Competition
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-925 border border-neutral-800 rounded-xl shadow-level-4 max-w-md w-full mx-4 p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-850">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                  <AlertTriangle className="h-4.5 w-4.5 text-error" />
                </div>
                <h3 className="text-sm font-heading font-bold text-neutral-100">Delete Competition</h3>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                You are about to permanently delete <span className="font-bold text-neutral-100">{deleteConfirm.name}</span>.
              </p>
              <div className="p-3 bg-error/5 border border-error/15 rounded-lg space-y-1.5">
                <p className="text-sm text-error font-semibold font-sans flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  This action is irreversible
                </p>
                <p className="text-sm text-error/80 font-sans leading-relaxed">
                  All associated teams, submissions, scores, rankings, and payment records will be permanently removed.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 px-6 py-4 border-t border-neutral-850 bg-neutral-950/40">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 justify-center text-xs py-2.5"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                isLoading={deleting}
                disabled={deleting}
                className="flex-1 justify-center text-xs py-2.5 gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Permanently</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

