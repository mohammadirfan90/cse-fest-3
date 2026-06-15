"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
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
  eligibility: string;
  prizePool: string;
  coverImageUrl?: string;
  rulebookUrl?: string;
  status?: string;
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

  const competitions = React.useMemo(() => (data?.success ? data.data : []), [data]);

  if (!mounted || isLoading) {
    return (
      <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-10 border-t border-neutral-850">
        <div className="text-center mb-16">
          <div className="h-4 bg-neutral-900 w-24 mx-auto rounded mb-3 animate-pulse" />
          <div className="h-8 bg-neutral-900 w-64 mx-auto rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-neutral-900/40 border border-neutral-850 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || competitions.length === 0) {
    return (
      <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-10 border-t border-neutral-850">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-[2px] w-8 bg-primary" />
            <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
              Competitions Arena
            </span>
            <div className="h-[2px] w-8 bg-primary" />
          </div>
          <h2 className="font-heading text-4xl font-extrabold text-neutral-100">Featured Challenges</h2>
        </div>
        <div className="py-16 text-center rounded-xl border border-dashed border-neutral-850 bg-neutral-900/10 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-extrabold text-lg text-neutral-300">Challenges Loading Soon</h3>
          <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-sm leading-relaxed">
            The organizer has not published any active competitions yet. Check back shortly to register!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="competitions" className="max-w-[1280px] mx-auto px-4 md:px-16 py-10 border-t border-neutral-850 relative">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-[2px] w-8 bg-primary" />
          <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
            Competitions Arena
          </span>
          <div className="h-[2px] w-8 bg-primary" />
        </div>
        <h2 className="font-heading text-4xl md:text-5xl font-black text-neutral-100 tracking-tight">
          Featured Challenges
        </h2>
        <p className="text-neutral-400 font-sans text-sm max-w-lg mx-auto mt-2.5">
          Browse the active showcases and tournaments. Command the stage and show your mastery.
        </p>
      </div>

      {/* Grid of Competitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
        {competitions.slice(0, 3).map((comp) => {
          const coverImage =
            comp.coverImageUrl ||
            COMPETITION_FALLBACK_IMAGES[comp.id] ||
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";

          return (
            <div
              key={comp.id}
              className="relative bg-glass border border-glass hover:border-primary/40 rounded-2xl flex flex-col group transition-all duration-normal hover:-translate-y-1.5 hover:shadow-level-3 overflow-hidden"
            >
              {/* Hover gradient glow */}
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-complex pointer-events-none" />

              {/* Cover image header */}
              <Link href={`/competitions/${comp.id}`} className="relative h-44 overflow-hidden rounded-t-2xl block">
                <div className="absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/25 to-transparent z-10" />
                <Image
                  src={coverImage}
                  alt={comp.name}
                  fill
                  className="object-cover group-hover:scale-[1.03] transition-transform duration-complex"
                  sizes="(max-width: 768px) 100vw, 380px"
                />
                <div className="absolute top-4 right-4 z-20">
                  <span className="bg-primary/25 backdrop-blur-md border border-primary/40 text-primary px-3.5 py-1 rounded-full text-sm font-bold font-mono tracking-wider">
                    {comp.teamSize.toUpperCase()}
                  </span>
                </div>
              </Link>

              {/* Content */}
              <div className="p-6 grow flex flex-col justify-between relative z-10 select-text">
                <Link href={`/competitions/${comp.id}`} className="block group-hover:opacity-95 transition-opacity">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-heading font-extrabold text-xl text-neutral-100 group-hover:text-neutral-50 transition-colors tracking-tight">
                      {comp.name}
                    </h3>
                    <Badge variant="accent" className="text-sm font-mono shrink-0 uppercase tracking-wider">
                      {comp.eligibility}
                    </Badge>
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm mb-4 line-clamp-2 leading-relaxed font-sans font-light">
                    {comp.shortDescription}
                  </p>
                </Link>

                <div className="mt-auto space-y-4">
                  <Link href={`/competitions/${comp.id}`} className="flex justify-between items-center py-3.5 border-y border-neutral-850/60 font-mono block hover:text-neutral-200 transition-colors">
                    <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Prize Pool</span>
                    <span className="text-secondary text-sm font-black">{comp.prizePool}</span>
                  </Link>
                  <div className="flex gap-3">
                    {comp.status === "registration_closed" ? (
                      <Button
                        disabled
                        className="grow bg-neutral-900 text-neutral-500 border border-neutral-850 py-3 h-auto rounded-xl text-sm font-bold font-sans cursor-not-allowed"
                      >
                        Registration Closed
                      </Button>
                    ) : (
                      <Link href={`/competitions/${comp.id}/register`} className="grow">
                        <Button className="w-full bg-primary hover:bg-primary/95 text-white py-3 h-auto rounded-xl text-sm font-bold font-sans">
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
                        className="w-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-300 hover:text-neutral-100 py-3 h-auto rounded-xl text-sm font-bold font-sans"
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
            <Button variant="secondary" className="gap-2 border border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 px-6 py-3 h-auto">
              <span>View All Competitions</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}

