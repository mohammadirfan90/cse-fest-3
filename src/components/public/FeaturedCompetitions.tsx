"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Competition {
  id: string;
  name: string;
  type: string;
  shortDescription: string;
  teamSize: string;
  fee: string;
  entryFee?: number;
  isFeePerPerson?: boolean;
  eligibility: string;
  prizePool: string;
  coverImageUrl?: string;
  rulebookUrl?: string;
  status?: string;
}

interface UserTeam {
  id: string;
  competition_id: string;
}

const COMPETITION_FALLBACK_IMAGES: Record<string, string> = {
  // UUID keys from seed_content.sql
  "e0bb66f8-45e0-4c12-a1f7-418f773b069d": "/software-showcase-logo.png",
  "318a4a58-89c0-449e-ba60-318df883ba58": "/iot-showcase-logo.png",
  "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa": "/idea-showcase-logo.png",
  // Slug keys for safety
  "software-showcase": "/software-showcase-logo.png",
  "iot-showcase": "/iot-showcase-logo.png",
  "idea-showcase": "/idea-showcase-logo.png",
};

export function FeaturedCompetitions() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { data, error, isLoading } = useSWR<{ success: boolean; data: Competition[] }>(
    mounted ? "/api/public/competitions" : null,
    fetcher
  );

  const { data: teamsData } = useSWR<{ success: boolean; data: UserTeam[] }>(
    mounted ? "/api/teams" : null,
    fetcher
  );

  const registeredCompIds = React.useMemo(() => {
    if (teamsData?.success && Array.isArray(teamsData.data)) {
      return new Set(teamsData.data.map((t) => t.competition_id));
    }
    return new Set<string>();
  }, [teamsData]);

  const competitions = React.useMemo(() => {
    if (!data?.success || !Array.isArray(data.data)) return [];
    return [...data.data].sort((a, b) => {
      const eligibilityA = a.eligibility?.toLowerCase();
      const eligibilityB = b.eligibility?.toLowerCase();
      if (eligibilityA === "both" && eligibilityB !== "both") return -1;
      if (eligibilityA !== "both" && eligibilityB === "both") return 1;
      return 0;
    });
  }, [data]);

  if (!mounted || isLoading) {
    return (
      <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-10 border-t border-neutral-200 dark:border-neutral-850">
        <div className="text-center mb-16">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-900 w-24 mx-auto rounded mb-3 animate-pulse" />
          <div className="h-8 bg-neutral-200 dark:bg-neutral-900 w-64 mx-auto rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-850 rounded-3xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || competitions.length === 0) {
    return (
      <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-10 border-t border-neutral-200 dark:border-neutral-850">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-[2px] w-8 bg-primary" />
            <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
              Competitions Arena
            </span>
            <div className="h-[2px] w-8 bg-primary" />
          </div>
          <h2 className="font-heading text-4xl font-extrabold text-[#111827] dark:text-neutral-100">Events</h2>
        </div>
        <div className="py-16 text-center rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-850 bg-[#FAF8FF] dark:bg-neutral-900/10 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-[#8B5CF6] dark:text-neutral-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-extrabold text-lg text-[#111827] dark:text-neutral-300">Challenges Loading Soon</h3>
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-neutral-500 font-sans max-w-sm leading-relaxed">
            The organizer has not published any active competitions yet. Check back shortly to register!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-16 border-t border-neutral-200 dark:border-neutral-850/50 relative overflow-hidden">
      {/* Subtle backdrop blur overlay to gently soften the background grid pattern */}
      <div className="absolute inset-0 bg-neutral-950/[0.02] dark:bg-neutral-950/20 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* Large, soft radial primary glow behind the card grid for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 dark:bg-primary/8 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-[2px] w-8 bg-primary/70" />
          <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
            Competitions Arena
          </span>
          <div className="h-[2px] w-8 bg-primary/70" />
        </div>
        <h2 className="font-heading text-4xl md:text-5xl font-black text-[#111827] dark:text-neutral-100 tracking-tight">
          Events
        </h2>
      </div>

      {/* Grid of Competitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
        {competitions.map((comp) => {
          const coverImage =
            comp.coverImageUrl ||
            COMPETITION_FALLBACK_IMAGES[comp.id] ||
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";

          return (
            <div
              key={comp.id}
              className="relative bg-white/90 dark:bg-[#12141a]/95 border border-neutral-200/80 dark:border-primary/15 rounded-3xl flex flex-col group transition-all duration-300 ease-out hover:-translate-y-2 shadow-[0_10px_30px_rgba(139,92,246,0.06),0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)] hover:border-[#8B5CF6]/35 overflow-hidden"
            >
              {/* Hover gradient glow */}
              <div className="absolute inset-0 bg-linear-to-br from-[#8B5CF6]/5 via-transparent to-[#22D3EE]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Cover image header with linear gradient fade */}
              <Link href={`/competitions/${comp.id}`} className="relative h-48 overflow-hidden rounded-t-[22px] block">
                <div className="absolute inset-0 bg-linear-to-t from-white dark:from-[#12141a] via-white/20 dark:via-[#12141a]/20 to-transparent z-10 transition-all duration-300" />
                <Image
                  src={coverImage}
                  alt={comp.name}
                  fill
                  className="object-cover group-hover:scale-[1.02] group-hover:brightness-105 transition-all duration-300"
                  sizes="(max-width: 768px) 100vw, 380px"
                  priority
                />
              </Link>

              {/* Content */}
              <div className="p-6 grow flex flex-col justify-between relative z-10 select-text">
                <Link href={`/competitions/${comp.id}`} className="block group-hover:opacity-95 transition-opacity">
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <h3 className="font-heading font-black text-2xl text-[#111827] dark:text-neutral-100 group-hover:text-[#8B5CF6] dark:group-hover:text-[#A78BFA] transition-colors duration-300 tracking-tight leading-snug">
                      {comp.name}
                    </h3>
                    <Badge variant="accent" className="text-sm font-mono shrink-0 uppercase tracking-wider">
                      {comp.name?.toLowerCase().includes("idea") || comp.id === "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa"
                        ? "College Only"
                        : comp.eligibility?.toLowerCase() === "both" || comp.eligibility?.toLowerCase() === "external"
                        ? "INTER-UNI"
                        : comp.eligibility}
                    </Badge>
                  </div>
                </Link>

                <div className="mt-auto space-y-5">
                  <div className="border-y border-neutral-200/50 dark:border-neutral-800/60 divide-y divide-neutral-250/20 dark:divide-neutral-800/50">
                    <Link href={`/competitions/${comp.id}`} className="flex justify-between items-center py-3.5 font-mono block hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Grand Prize Pool</span>
                      <span className="text-[#8B5CF6] dark:text-[#A78BFA] text-xl font-black font-heading">{comp.prizePool}</span>
                    </Link>
                    <Link href={`/competitions/${comp.id}`} className="flex justify-between items-start py-3.5 font-mono block hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-0.5">Entry Fee</span>
                      <div className="text-right">
                        <span className="text-neutral-800 dark:text-neutral-200 font-bold text-base">
                          {comp.entryFee === 0 ? "Free" : `${comp.entryFee} BDT`}
                        </span>
                        {comp.isFeePerPerson && (
                          <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-sans font-medium">per person</span>
                        )}
                      </div>
                    </Link>
                  </div>
                  <div className="flex gap-3">
                    {comp.status === "registration_closed" ? (
                      <Button
                        disabled
                        className="grow bg-neutral-200 dark:bg-neutral-900 text-neutral-500 border border-neutral-300 dark:border-neutral-850 py-3.5 h-auto rounded-xl font-heading text-base font-black tracking-widest cursor-not-allowed"
                      >
                        Registration Closed
                      </Button>
                    ) : registeredCompIds.has(comp.id) ? (
                      <Link href="/dashboard" className="grow">
                        <Button className="w-full bg-success/20 hover:bg-success/30 text-success border border-success/30 py-3.5 h-auto rounded-xl font-heading text-base font-black tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
                          <CheckCircle className="h-5 w-5" />
                          <span>Registered</span>
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/competitions/${comp.id}/register`} className="grow">
                        <Button className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:from-[#9D66FF] hover:to-[#B56BFF] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-heading text-base font-black tracking-widest py-3.5 h-auto rounded-xl cursor-pointer">
                          Register
                        </Button>
                      </Link>
                    )}
                    <Link
                      href={comp.rulebookUrl || `/competitions/${comp.id}`}
                      target={comp.rulebookUrl ? "_blank" : undefined}
                      rel={comp.rulebookUrl ? "noopener noreferrer" : undefined}
                      className="grow"
                    >
                      <Button
                        variant="secondary"
                        className="w-full border border-[#8B5CF6] dark:border-[#8B5CF6]/50 bg-white dark:bg-[#12141a]/60 text-[#8B5CF6] dark:text-[#A78BFA] hover:bg-[#FAF8FF] dark:hover:bg-neutral-900/40 py-3.5 h-auto rounded-xl font-heading text-base font-black tracking-widest cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300"
                      >
                        Rulebook
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explore All Button */}
      {competitions.length > 0 && (
        <div className="flex justify-center mt-12 relative z-10">
          <Link href="/competitions">
            <Button variant="secondary" className="gap-2 border border-[#8B5CF6] dark:border-[#8B5CF6]/50 bg-white dark:bg-[#12141a]/60 text-[#8B5CF6] dark:text-[#A78BFA] hover:bg-[#FAF8FF] dark:hover:bg-neutral-900/40 px-6 py-3 h-auto rounded-xl font-bold font-sans cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300">
              <span>View All Competitions</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}

