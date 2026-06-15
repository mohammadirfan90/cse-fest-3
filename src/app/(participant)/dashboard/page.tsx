"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Trophy,
  FileText,
  Video,
  ExternalLink,
  Calendar,
  Crown,
  AlertCircle,
  Plus,
  Compass,
  ArrowRight,
  LogOut,
  Mail,
  Phone,
  Bookmark,
  CheckCircle,
  Clock,
  HelpCircle,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

interface Member {
  id: string;
  role: string;
  invitation_status: string;
  verification_status: string;
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
  } | null;
  members: Member[];
  submission?: any | null; // loaded client-side per team
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null);

  const [allCompetitions, setAllCompetitions] = React.useState<any[]>([]);

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

      setUserEmail(user.email ?? null);
      setUserName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Innovator");

      // Fetch teams and rosters
      const res = await fetch("/api/teams");
      const resData = await res.json();

      if (!resData.success) {
        throw new Error(resData.message || "Failed to load registrations.");
      }

      const activeTeams: Team[] = resData.data || [];

      // Fetch submissions client-side for each team
      const teamsWithSubmissions = await Promise.all(
        activeTeams.map(async (team) => {
          try {
            const subRes = await fetch(`/api/submissions?team_id=${team.id}`);
            const subData = await subRes.json();
            return {
              ...team,
              submission: subData.success && subData.data ? subData.data : null,
            };
          } catch (err) {
            console.error(`Failed to load submission for team ${team.id}:`, err);
            return { ...team, submission: null };
          }
        })
      );

      setTeams(teamsWithSubmissions);

      // Fetch all competitions
      const compRes = await fetch("/api/public/competitions");
      const compData = await compRes.json();
      if (compData.success) {
        setAllCompetitions(compData.data || []);
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setErrorMsg(err.message || "An error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Log out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const getTeamStatusBadge = (status: string) => {
    const isSuccess = status === "selected" || status === "finalist";
    const isDanger = status === "rejected";
    const isWarning = status === "pending" || status === "forming";
    const isInfo = status === "submitted" || status === "registered";

    const variant = isSuccess
      ? "success"
      : isDanger
      ? "error"
      : isWarning
      ? "warning"
      : isInfo
      ? "primary"
      : "neutral";

    return (
      <Badge variant={variant} className="capitalize text-xxs font-mono font-bold tracking-wider py-0.5 px-2.5">
        {status}
      </Badge>
    );
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

      {/* Main Registrations Section */}
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
              const videoUrl = team.submission ? `/api/submissions/file/${team.submission.id}?type=video` : null;

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
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-mono text-neutral-500 uppercase tracking-wider">Registration Status</span>
                          {getTeamStatusBadge(team.status)}
                        </div>
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

                                {videoUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveVideoId(
                                        activeVideoId === team.id ? null : team.id
                                      )
                                    }
                                    className="w-full flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-850 hover:border-neutral-700 transition-colors text-neutral-300 hover:text-neutral-100 text-xxs font-mono uppercase tracking-wider"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Video className="h-3.5 w-3.5 text-neutral-400" />
                                      <span>Demo Video</span>
                                    </span>
                                    <span className="text-sm text-neutral-500 font-sans">
                                      {activeVideoId === team.id ? "Hide Player" : "Play Video"}
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* Inline Video Player */}
                              {videoUrl && activeVideoId === team.id && (
                                <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black p-1 animate-fade-in">
                                  <video
                                    src={videoUrl}
                                    controls
                                    className="w-full aspect-video rounded bg-black border border-neutral-900"
                                    preload="metadata"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              )}

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
                  COMPETITION_IMAGES[comp.shortName?.toLowerCase()] ||
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
                          <Link href={`/competitions/${comp.id}/register`} className="grow">
                            <Button className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 h-auto rounded-md text-base font-bold font-sans">
                              Register
                            </Button>
                          </Link>
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
    </motion.div>
  );
}
