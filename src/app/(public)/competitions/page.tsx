"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search, Sparkles, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Input } from "@/components/ui/input";
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

const COMPETITION_IMAGES: Record<string, string> = {
  // UUID keys from seed_content.sql
  "e0bb66f8-45e0-4c12-a1f7-418f773b069d": "/software-showcase-logo.png",
  "318a4a58-89c0-449e-ba60-318df883ba58": "/iot-showcase-logo.png",
  "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa": "/idea-showcase-logo.png",
  // Slug keys for safety
  "software-showcase": "/software-showcase-logo.png",
  "iot-showcase": "/iot-showcase-logo.png",
  "idea-showcase": "/idea-showcase-logo.png",
};

function CompetitionsListContent() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | "external" | "internal">("all");
  const searchParams = useSearchParams();
  const selectParam = searchParams.get("select");

  React.useEffect(() => {
    if (selectParam) {
      const shortNameMap: Record<string, string> = {
        software: "Software",
        iot: "IoT",
        idea: "Idea",
        cp: "Programming",
        datathon: "Datathon",
        ctf: "CTF",
        robo: "Robo",
        lfr: "LFR",
        valorant: "Valorant",
        fifa: "FIFA"
      };
      const mappedQuery = shortNameMap[selectParam] || selectParam;
      setTimeout(() => {
        setSearchQuery(mappedQuery);
      }, 0);
    }
  }, [selectParam]);

  const { data, isLoading } = useSWR<{ success: boolean; data: Competition[] }>(
    "/api/public/competitions",
    fetcher
  );

  const { data: teamsData } = useSWR<{ success: boolean; data: UserTeam[] }>(
    "/api/teams",
    fetcher
  );

  const registeredCompIds = React.useMemo(() => {
    if (teamsData?.success && Array.isArray(teamsData.data)) {
      return new Set(teamsData.data.map((t) => t.competition_id));
    }
    return new Set<string>();
  }, [teamsData]);

  const competitionsList = React.useMemo(() => (data?.success ? data.data : []), [data]);

  const filteredCompetitions = React.useMemo(() => {
    return competitionsList.filter((comp) => {
      const matchesSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "external"
          ? (comp.eligibility === "external" || comp.eligibility === "both")
          : comp.eligibility === categoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [competitionsList, searchQuery, categoryFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background selection:bg-primary/30 bg-grid-pattern">
      <Navbar />

      <main className="grow pt-10 pb-20 px-4 md:px-16 max-w-[1280px] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-12 relative">
          <div className="absolute top-0 right-0 w-[20vw] h-[20vw] bg-primary/8 rounded-full blur-[80px] pointer-events-none" />
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-50 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[2px] w-12 bg-primary" />
            <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
              Competitions Directory
            </span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-neutral-100 mb-4">All Segments</h1>
        </header>

        {/* Filter Dashboard */}
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-850 p-6 rounded-xl mb-12 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center text-sm md:text-base">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold font-sans transition-all ${
                categoryFilter === "all"
                  ? "bg-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  : "bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800/40 border border-neutral-850"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setCategoryFilter("external")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold font-sans transition-all ${
                categoryFilter === "external"
                  ? "bg-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  : "bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800/40 border border-neutral-850"
              }`}
            >
              INTER-UNI / College
            </button>
            <button
              onClick={() => setCategoryFilter("internal")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold font-sans transition-all ${
                categoryFilter === "internal"
                  ? "bg-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  : "bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800/40 border border-neutral-850"
              }`}
            >
              SMUCT-Only
            </button>
          </div>

          <div className="h-10 w-px bg-neutral-850 hidden md:block" />

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative grow md:w-64">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-neutral-850 bg-neutral-950/40"
                placeholder="Search events..."
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-neutral-500 uppercase font-sans">Status:</span>
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-bold text-primary uppercase font-sans">Open</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] bg-neutral-900/40 border border-neutral-850 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredCompetitions.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredCompetitions.map((comp) => {
                const coverImage =
                  comp.coverImageUrl ||
                  COMPETITION_IMAGES[comp.id] ||
                  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";
                return (
                  <div
                    key={comp.id}
                    className="relative bg-neutral-900/40 rounded-xl flex flex-col group border border-neutral-850 transition-all duration-normal hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] overflow-hidden"
                  >
                    {/* Cover image header */}
                    <Link href={`/competitions/${comp.id}`} className="relative h-48 overflow-hidden rounded-t-xl block">
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
                          {comp.teamSize.toUpperCase()}
                        </span>
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-6 grow flex flex-col justify-between">
                      <Link href={`/competitions/${comp.id}`} className="block group-hover:opacity-95 transition-opacity">
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <h3 className="font-heading font-extrabold text-xl text-neutral-100 group-hover:text-neutral-50 transition-colors">
                            {comp.name}
                          </h3>
                          <Badge variant="accent" className="text-sm font-mono shrink-0 uppercase">
                            {comp.name?.toLowerCase().includes("idea") || comp.id === "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa"
                              ? "College Only"
                              : comp.eligibility?.toLowerCase() === "both" || comp.eligibility?.toLowerCase() === "external"
                              ? "INTER-UNI"
                              : comp.eligibility}
                          </Badge>
                        </div>
                      </Link>

                      <div className="mt-auto space-y-4">
                        <Link href={`/competitions/${comp.id}`} className="flex justify-between items-center py-3 border-y border-neutral-850 block hover:text-neutral-200 transition-colors">
                          <span className="text-sm font-bold text-neutral-500 uppercase font-sans">Prize Pool</span>
                          <span className="font-mono text-secondary dark:text-white text-sm font-extrabold">{comp.prizePool}</span>
                        </Link>
                        <div className="flex gap-3">
                          {comp.status === "registration_closed" ? (
                            <Button
                              disabled
                              className="grow bg-neutral-900 text-neutral-500 border border-neutral-850 py-3 h-auto rounded-lg text-sm font-bold font-sans cursor-not-allowed"
                            >
                              Registration Closed
                            </Button>
                          ) : registeredCompIds.has(comp.id) ? (
                            <Link href="/dashboard" className="grow">
                              <Button className="w-full bg-success/20 hover:bg-success/30 text-success border border-success/30 py-3 h-auto rounded-lg text-sm font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer">
                                <CheckCircle className="h-4 w-4" />
                                <span>Registered</span>
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/competitions/${comp.id}/register`} className="grow">
                              <Button className="w-full bg-primary hover:bg-primary/95 text-white py-3 h-auto rounded-lg text-sm font-bold font-sans">
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
                              className="w-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:text-neutral-100 py-3 h-auto rounded-lg text-sm font-bold font-sans"
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
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="py-20 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/10 backdrop-blur-sm max-w-xl mx-auto flex flex-col items-center justify-center space-y-4 relative z-10"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                <Sparkles className="h-8 w-8 text-neutral-600 animate-pulse" />
              </div>
              <h3 className="font-heading font-extrabold text-lg text-neutral-300">No Challenges Found</h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-sm leading-relaxed">
                We couldn&apos;t find any active showcases matching &quot;{searchQuery}&quot;. Clear search filters and
                view all active listings.
              </p>
              <div className="pt-2">
                <Button variant="secondary" onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }} className="font-semibold text-xs py-2 h-auto">
                  Clear Search
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

export default function CompetitionsListingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern animate-pulse">
        <Navbar />
        <main className="grow pt-10 pb-20 px-4 md:px-16 max-w-[1280px] mx-auto w-full flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    }>
      <CompetitionsListContent />
    </Suspense>
  );
}

