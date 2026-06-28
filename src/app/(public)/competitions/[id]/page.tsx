"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Users,
  Shield,
  CreditCard,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import useSWR from "swr";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { getCompetitionContact } from "@/constants/contacts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface Competition {
  id: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  teamSize: string;
  fee: string;
  entryFee?: number;
  isFeePerPerson?: boolean;
  eligibility: string;
  prizePool: string;
  championPrize: string;
  runnerUpPrize: string;
  secondRunnerUp: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  rulebookUrl?: string;
  registrationStart?: string;
  registrationEnd?: string;
  status?: string;
}

interface UserTeam {
  id: string;
  competition_id: string;
}

const COMPETITION_IMAGES: Record<string, string> = {
  "e0bb66f8-45e0-4c12-a1f7-418f773b069d": "/software-showcase-logo.png",
  "318a4a58-89c0-449e-ba60-318df883ba58": "/iot-showcase-logo.png",
  "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa": "/idea-showcase-logo.png",
  "software-showcase": "/software-showcase-logo.png",
  "iot-showcase": "/iot-showcase-logo.png",
  "idea-showcase": "/idea-showcase-logo.png",
};

export default function CompetitionDetailPage() {
  const params = useParams();
  const compId = params?.id as string;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 220, mass: 0.6 };
  const spotlightX = useSpring(mouseX, springConfig);
  const spotlightY = useSpring(mouseY, springConfig);
  const spotlightBackground = useMotionTemplate`radial-gradient(350px circle at ${spotlightX}px ${spotlightY}px, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 100%)`;

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: Competition;
  }>(compId ? `/api/public/competitions?id=${compId}` : null, fetcher);

  const { data: teamsData } = useSWR<{ success: boolean; data: UserTeam[] }>(
    "/api/teams",
    fetcher,
  );

  const isUserRegistered = React.useMemo(() => {
    if (teamsData?.success && Array.isArray(teamsData.data)) {
      return teamsData.data.some((t) => t.competition_id === compId);
    }
    return false;
  }, [teamsData, compId]);

  const competition = React.useMemo(
    () => (data?.success ? data.data : null),
    [data],
  );

  const contactInfo = React.useMemo(() => {
    if (!competition) return null;
    return getCompetitionContact(competition);
  }, [competition]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF8FF] dark:bg-[#0f1117] text-on-background bg-grid-pattern bg-noise">
        <Navbar />
        <main className="grow mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full space-y-8 animate-pulse relative z-10">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-900 w-32 rounded animate-pulse" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-900 w-full rounded-3xl animate-pulse" />
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="grow space-y-4">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-900 w-64 rounded animate-pulse" />
              <div className="h-32 bg-neutral-200 dark:bg-neutral-900 w-full rounded animate-pulse" />
            </div>
            <div className="w-full lg:w-80 h-64 bg-neutral-200 dark:bg-neutral-900 rounded-3xl animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF8FF] dark:bg-[#0f1117]">
        <Navbar />
        <div className="grow flex flex-col items-center justify-center py-24 px-4 text-center">
          <h2 className="text-2xl font-heading font-extrabold text-neutral-800 dark:text-neutral-300 mb-4">
            Competition Not Found
          </h2>
          <p className="text-sm text-neutral-500 font-sans mb-6">
            The competition you are looking for does not exist or has been
            archived.
          </p>
          <Link href="/competitions">
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-sans font-bold py-3.5 px-6 rounded-xl">
              Return to Catalog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#FAF8FF] via-[#F8F9FF] to-[#FCFBFF] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-on-background relative overflow-hidden bg-noise">
      {/* Mouse-following spotlight effect */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30 hidden sm:block"
        style={{ background: spotlightBackground }}
      />

      {/* Dynamic Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.09] dark:opacity-[0.18] pointer-events-none z-0 animate-subtle-grid-pulse" />

      {/* Subtle animated gradient movement in background */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-[#8B5CF6]/8 via-transparent to-[#22D3EE]/8 dark:from-[#8B5CF6]/15 dark:to-[#22D3EE]/8 opacity-55 animate-gradient-shift pointer-events-none z-0"
        style={{ animationDuration: "15s" }}
      />

      {/* Ambient lighting / Radial Glow effects */}
      <div className="absolute top-[6%] left-[10%] w-[800px] h-[800px] bg-[#8B5CF6]/16 dark:bg-[#8B5CF6]/12 rounded-full blur-[160px] pointer-events-none z-0 animate-blob-slow-1" />
      <div className="absolute top-[38%] right-[5%] w-[700px] h-[700px] bg-[#22D3EE]/12 dark:bg-[#22D3EE]/8 rounded-full blur-[140px] pointer-events-none z-0 animate-blob-slow-2" />
      <div className="absolute bottom-[18%] left-[12%] w-[750px] h-[750px] bg-[#F4B400]/10 dark:bg-[#F4B400]/6 rounded-full blur-[150px] pointer-events-none z-0 animate-blob-slow-3" />

      {/* Light floating background particles */}
      <div className="absolute top-[12%] left-[10%] w-2.5 h-2.5 bg-[#8B5CF6]/45 rounded-full blur-[0.5px] animate-drift-slow-1 pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-3 h-3 bg-[#22D3EE]/45 rounded-full blur-[0.5px] animate-drift-slow-2 pointer-events-none" />
      <div className="absolute bottom-[40%] left-[22%] w-2 h-2 bg-[#F4B400]/50 rounded-full blur-[0.5px] animate-drift-slow-3 pointer-events-none" />
      <div className="absolute top-[60%] left-[8%] w-3 h-3 bg-[#8B5CF6]/35 rounded-full blur-[0.5px] animate-drift-slow-2 pointer-events-none" />
      <div className="absolute bottom-[25%] right-[20%] w-2.5 h-2.5 bg-[#22D3EE]/45 rounded-full blur-[0.5px] animate-drift-slow-1 pointer-events-none" />
      <div className="absolute top-[25%] right-[30%] w-2 h-2 bg-[#F4B400]/40 rounded-full blur-[0.5px] animate-drift-slow-3 pointer-events-none" />

      <Navbar />

      <main className="flex-1 mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full space-y-12 relative z-10">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/competitions"
            className="inline-flex items-center gap-2 text-sm text-[#4B5563] hover:text-[#8B5CF6] dark:text-neutral-400 dark:hover:text-neutral-55 transition-colors font-mono font-bold uppercase tracking-wider group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Competitions</span>
          </Link>
        </motion.div>

        {/* Hero Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative rounded-3xl border border-neutral-200/80 dark:border-primary/15 bg-white/80 dark:bg-[#0f1117]/60 backdrop-blur-xl p-8 md:p-12 overflow-hidden shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)] group transition-all duration-500 hover:border-[#8B5CF6]/35"
        >
          {/* Backlighting inside hero */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 right-10 w-80 h-80 bg-[#22D3EE]/12 rounded-full blur-[80px] pointer-events-none" />

          {/* Floating hero particles */}
          <div className="absolute top-10 right-16 w-8 h-8 rounded-full border border-[#8B5CF6]/20 dark:border-primary/45 animate-float pointer-events-none opacity-40" />
          <div
            className="absolute bottom-10 left-1/3 w-6 h-6 rounded-full border border-[#22D3EE]/20 dark:border-secondary/45 animate-float pointer-events-none opacity-40"
            style={{ animationDelay: "2s" }}
          />

          {/* Banner image with smooth zoom hover */}
          {competition.bannerImageUrl ||
          competition.coverImageUrl ||
          COMPETITION_IMAGES[competition.id] ? (
            <>
              <Image
                src={
                  competition.bannerImageUrl ||
                  competition.coverImageUrl ||
                  COMPETITION_IMAGES[competition.id] ||
                  ""
                }
                alt={competition.name}
                fill
                className="object-cover opacity-15 dark:opacity-25 pointer-events-none group-hover:scale-[1.04] group-hover:brightness-110 transition-all duration-700 ease-out"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-r from-white/95 via-white/85 to-transparent dark:from-neutral-950 dark:via-neutral-950/85 dark:to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] font-sans text-sm font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                  Registrations Open
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tight bg-gradient-to-r from-[#111827] via-[#8B5CF6] to-[#4B5563] dark:from-white dark:via-[#8B5CF6] dark:to-[#9CA3AF] bg-clip-text text-transparent leading-none">
                {competition.name.toUpperCase()}
              </h1>
              <p className="text-sm sm:text-base text-[#4B5563] dark:text-neutral-400 font-sans leading-relaxed">
                {competition.shortDescription}
              </p>

              {/* Metadata Pills */}
              {competition.registrationStart && competition.registrationEnd && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Badge
                    variant="secondary"
                    className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-[#4B5563] dark:text-neutral-300 text-base sm:text-lg md:text-xl font-mono py-2.5 px-5 rounded-full flex items-center gap-2.5 shadow-sm font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase">
                      Opens:
                    </span>
                    <span className="font-extrabold text-[#111827] dark:text-neutral-100">
                      {formatDate(competition.registrationStart)}
                    </span>
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-[#4B5563] dark:text-neutral-300 text-base sm:text-lg md:text-xl font-mono py-2.5 px-5 rounded-full flex items-center gap-2.5 shadow-sm font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                    <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase">
                      Deadline:
                    </span>
                    <span className="text-[#8B5CF6] dark:text-[#A78BFA] font-bold">
                      {formatDate(competition.registrationEnd)}
                    </span>
                  </Badge>
                </div>
              )}
            </div>

            {/* Buttons in Header */}
            <div className="shrink-0 flex flex-col gap-3 w-full md:w-56 relative z-20">
              {competition.status === "registration_closed" ? (
                <Button
                  disabled
                  className="w-full bg-neutral-900 text-neutral-500 border border-neutral-850 py-4 h-auto rounded-xl font-heading text-base font-black cursor-not-allowed tracking-widest"
                >
                  REGISTRATION CLOSED
                </Button>
              ) : isUserRegistered ? (
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full bg-success/20 hover:bg-success/30 text-success border border-success/30 py-4 h-auto rounded-xl font-heading font-black text-lg flex items-center justify-center gap-1.5 tracking-wider cursor-pointer">
                    <CheckCircle className="h-5 w-5" />
                    <span>REGISTERED</span>
                  </Button>
                </Link>
              ) : (
                <Link
                  href={`/competitions/${compId}/register`}
                  className="w-full"
                >
                  <Button className="w-full relative overflow-hidden bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:from-[#9D66FF] hover:to-[#B56BFF] text-white font-heading font-black text-lg py-4 h-auto rounded-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group cursor-pointer tracking-wider">
                    <span className="relative z-10">REGISTER NOW</span>
                    <div className="absolute inset-0 w-[50%] h-full bg-white/25 skew-x-[-25deg] -translate-x-[150%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
                  </Button>
                </Link>
              )}
              {competition.rulebookUrl && (
                <a
                  href={competition.rulebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="secondary"
                    className="w-full border border-[#8B5CF6] dark:border-[#8B5CF6]/50 bg-white dark:bg-[#12141a]/60 text-[#8B5CF6] dark:text-[#A78BFA] hover:bg-[#FAF8FF] dark:hover:bg-neutral-900/40 py-3.5 h-auto rounded-xl font-heading text-base font-black tracking-widest cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300"
                  >
                    OPEN RULEBOOK
                  </Button>
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Main Content (Left Column - 70%) */}
          <div className="grow w-full lg:w-0 space-y-16">
            {/* Prizes Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-[#F4B400] animate-pulse" />
                <h3 className="font-heading text-2xl font-black text-[#111827] dark:text-neutral-100 tracking-tight font-heading">
                  Reward Pool Split
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 items-stretch">
                {/* Champion Card (Premium Gold styling) */}
                <div className="bg-white/60 dark:bg-[#12141a]/60 backdrop-blur-xl border border-[#F4B400] p-8 rounded-3xl flex flex-col justify-between items-center text-center space-y-5 hover:-translate-y-2 shadow-[0_10px_30px_rgba(244,180,0,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(244,180,0,0.18)] transition-all duration-300 group/champ relative overflow-hidden sm:scale-105 z-10">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#F4B400]/8 to-transparent pointer-events-none z-0" />
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#F4B400]/10 border border-[#F4B400]/20 flex items-center justify-center text-[#F4B400] group-hover/champ:scale-110 group-hover/champ:rotate-6 transition-transform duration-300">
                    <Trophy className="h-8 w-8 drop-shadow-[0_0_8px_rgba(244,180,0,0.4)]" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <h5 className="font-sans text-xs font-black uppercase tracking-widest text-[#F4B400]">
                      Champion
                    </h5>
                    <div className="font-heading text-2xl font-black mt-1 bg-gradient-to-r from-[#F4B400] via-[#F5C842] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(244,180,0,0.15)]">
                      {competition.championPrize}
                    </div>
                  </div>
                  <p className="relative z-10 text-sm text-[#4B5563] dark:text-neutral-400 leading-normal font-sans">
                    Certificate + Goodies
                  </p>
                </div>

                {/* Runner Up */}
                <div className="bg-white/60 dark:bg-[#12141a]/60 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 rounded-3xl flex flex-col justify-between items-center text-center space-y-5 hover:-translate-y-1.5 shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)] hover:border-[#8B5CF6]/35 transition-all duration-300 group/runner relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-neutral-200/5 to-transparent opacity-0 group-hover/runner:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 flex items-center justify-center text-neutral-400 dark:text-neutral-300 group-hover/runner:scale-110 group-hover/runner:-rotate-6 transition-transform duration-300">
                    <Trophy className="h-6 w-6 drop-shadow-[0_0_8px_rgba(160,160,160,0.3)]" />
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-sans text-xs font-bold uppercase tracking-widest text-[#4B5563] dark:text-neutral-400">
                      Runner Up
                    </h5>
                    <div className="font-heading text-xl font-black text-[#111827] dark:text-neutral-100 mt-1">
                      {competition.runnerUpPrize}
                    </div>
                  </div>
                  <p className="text-sm text-[#4B5563] dark:text-neutral-400 leading-normal font-sans">
                    Certificate + Goodies
                  </p>
                </div>

                {/* 2nd Runner Up */}
                <div className="bg-white/60 dark:bg-[#12141a]/60 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 rounded-3xl flex flex-col justify-between items-center text-center space-y-5 hover:-translate-y-1.5 shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)] hover:border-[#8B5CF6]/35 transition-all duration-300 group/runner2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#CD7F32]/5 to-transparent opacity-0 group-hover/runner2:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-[#CD7F32]/10 border border-[#CD7F32]/25 flex items-center justify-center text-[#CD7F32] group-hover/runner2:scale-110 group-hover/runner2:rotate-6 transition-transform duration-300">
                    <Trophy className="h-6 w-6 drop-shadow-[0_0_8px_rgba(205,127,50,0.3)]" />
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-sans text-xs font-bold uppercase tracking-widest text-[#4B5563] dark:text-neutral-400">
                      2nd Runner Up
                    </h5>
                    <div className="font-heading text-xl font-black text-[#111827] dark:text-neutral-100 mt-1">
                      {competition.secondRunnerUp}
                    </div>
                  </div>
                  <p className="text-sm text-[#4B5563] dark:text-neutral-400 leading-normal font-sans">
                    Certificate + Goodies
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Overview Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-[#22D3EE]" />
                <h3 className="font-heading text-2xl font-black text-[#111827] dark:text-neutral-100 tracking-tight">
                  Contest Overview
                </h3>
              </div>
              <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
                <ReactMarkdown>{competition.description}</ReactMarkdown>
              </div>
              {/* <div className="space-y-4 mt-6 border-t border-neutral-200 dark:border-neutral-800/60 pt-6 font-sans">
                <h4 className="font-heading text-sm font-bold text-[#8B5CF6] uppercase font-sans">Key Highlights</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#111827] dark:text-neutral-200 block text-sm font-sans">Cloud Credits Eligible</strong>
                      <span className="text-[#4B5563] dark:text-neutral-400 text-xs sm:text-sm font-sans">Teams successfully passing Phase 1 receive credits for system deployment and staging.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#111827] dark:text-neutral-200 block text-sm font-sans">Mentorship Guidance</strong>
                      <span className="text-[#4B5563] dark:text-neutral-400 text-xs sm:text-sm font-sans">Interact directly with department advisors and alumni software engineering experts.</span>
                    </div>
                  </li>
                </ul>
              </div> */}
            </motion.div>
          </div>

          {/* Sidebar Widgets (Right Column - 30% Sticky) */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6 relative z-10">
            {/* Ambient sidebar glow */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#8B5CF6]/8 rounded-full blur-[60px] pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="bg-white/60 dark:bg-[#12141a]/60 backdrop-blur-xl border border-neutral-200/80 dark:border-primary/15 rounded-3xl p-6 space-y-6 shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)] hover:border-[#8B5CF6]/35 transition-all duration-300 group"
            >
              <h3 className="font-heading text-lg font-bold text-[#111827] dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                Competition Brief
              </h3>

              <div className="space-y-4">
                <div
                  className="flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 flex items-center justify-center font-sans group-hover:scale-105 transition-transform duration-300">
                    <CreditCard className="h-4 w-4 text-[#22D3EE]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-bold">
                      Entry Fee
                    </div>
                    <div className="text-[#111827] dark:text-neutral-200 font-semibold text-sm font-sans">
                      {competition.entryFee === 0 ? (
                        "Free"
                      ) : (
                        <>
                          <span>{competition.entryFee} BDT</span>
                          {competition.isFeePerPerson && (
                            <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 font-medium mt-0.5">per person</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-4 font-sans animate-fade-in"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Users className="h-4 w-4 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-bold">
                      Team Size
                    </div>
                    <div className="text-[#111827] dark:text-neutral-200 font-semibold text-sm font-sans">
                      {competition.teamSize}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-4 font-sans animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Shield className="h-4 w-4 text-[#22D3EE]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-bold">
                      Eligibility
                    </div>
                    <div className="text-[#111827] dark:text-neutral-200 font-semibold text-sm capitalize font-sans">
                      {competition.name?.toLowerCase().includes("idea") || competition.id === "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa"
                        ? "College Only"
                        : competition.eligibility?.toLowerCase() === "both" || competition.eligibility?.toLowerCase() === "external"
                        ? "INTER-UNI"
                        : `${competition.eligibility} Only`}
                    </div>
                  </div>
                </div>
              </div>

              {competition.status === "registration_closed" ? (
                <Button
                  disabled
                  className="w-full bg-neutral-900 text-neutral-500 border border-neutral-850 py-3.5 h-auto rounded-xl font-sans font-bold text-sm uppercase tracking-widest cursor-not-allowed"
                >
                  REGISTRATION CLOSED
                </Button>
              ) : isUserRegistered ? (
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full bg-success/20 hover:bg-success/30 text-success border border-success/30 py-3.5 h-auto rounded-xl font-sans font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer">
                    <CheckCircle className="h-4 w-4" />
                    <span>Registered</span>
                  </Button>
                </Link>
              ) : (
                <Link href={`/competitions/${compId}/register`}>
                  <Button className="w-full relative overflow-hidden bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:from-[#9D66FF] hover:to-[#B56BFF] text-white font-sans font-bold text-sm uppercase tracking-widest py-3.5 h-auto rounded-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer group">
                    <span className="relative z-10">Apply to Participate</span>
                    <div className="absolute inset-0 w-[50%] h-full bg-white/25 skew-x-[-25deg] -translate-x-[150%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Support Helper Widget */}
            {contactInfo && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
                className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-850 rounded-3xl p-5 flex items-center gap-4 hover:bg-[#FAF8FF] dark:hover:bg-neutral-900/80 hover:border-[#8B5CF6]/35 dark:hover:border-[#8B5CF6]/30 transition-all duration-300 shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)]"
              >
                <HelpCircle className="h-5 w-5 text-[#8B5CF6] shrink-0" />
                <div>
                  <h4 className="font-sans text-xs font-bold text-[#111827] dark:text-neutral-200">
                    Need Assistance?
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 font-sans mt-0.5 leading-tight">
                    Contact: {contactInfo.coordinator}
                  </p>
                  <a
                    href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`}
                    className="text-sm font-semibold text-[#8B5CF6] dark:text-[#A78BFA] hover:underline font-mono inline-block mt-1 focus-visible:outline-none"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
              </motion.div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
