"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, Trophy, Users, Shield, CreditCard, HelpCircle, CheckCircle } from "lucide-react";
import useSWR from "swr";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    let fileId = "";
    const dMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) {
      fileId = dMatch[1];
    } else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }
  return url;
}

interface Competition {
  id: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  teamSize: string;
  fee: string;
  eligibility: string;
  prizePool: string;
  championPrize: string;
  runnerUpPrize: string;
  secondRunnerUp: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  rulebookUrl?: string;
}

export default function CompetitionDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = React.useState<"overview" | "rules" | "timeline" | "prizes">("overview");

  const compId = params?.id as string;

  const { data, error, isLoading } = useSWR<{ success: boolean; data: Competition }>(
    compId ? `/api/public/competitions?id=${compId}` : null,
    fetcher
  );

  const competition = React.useMemo(() => (data?.success ? data.data : null), [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
        <Navbar />
        <main className="grow mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full space-y-8 animate-pulse">
          <div className="h-6 bg-neutral-900 w-32 rounded" />
          <div className="h-48 bg-neutral-900 w-full rounded-2xl" />
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="grow space-y-4">
              <div className="h-10 bg-neutral-900 w-64 rounded" />
              <div className="h-32 bg-neutral-900 w-full rounded" />
            </div>
            <div className="w-full lg:w-80 h-64 bg-neutral-900 rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="grow flex flex-col items-center justify-center py-24 px-4 text-center">
          <h2 className="text-2xl font-heading font-extrabold text-neutral-300 mb-4">Competition Not Found</h2>
          <p className="text-sm text-neutral-500 font-sans mb-6">
            The competition you are looking for does not exist or has been archived.
          </p>
          <Link href="/competitions">
            <Button className="bg-primary text-white font-sans font-bold">Return to Catalog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
      <Navbar />

      <main className="flex-1 mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/competitions"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Competitions</span>
          </Link>
        </div>

        {/* Hero Area */}
        <div className="relative rounded-2xl border border-neutral-850 bg-neutral-950 p-8 md:p-12 overflow-hidden">
          {/* Background image if added */}
          {(competition.bannerImageUrl || competition.coverImageUrl) ? (
            <>
              <Image
                src={competition.bannerImageUrl || competition.coverImageUrl || ""}
                alt={competition.name}
                fill
                className="object-cover opacity-20 pointer-events-none"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-r from-neutral-950 via-neutral-950/85 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent pointer-events-none" />
          )}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent" className="text-xs uppercase font-mono font-bold tracking-wider py-1">
                  {competition.type}
                </Badge>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-sans text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Registrations Open
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-heading text-neutral-50 tracking-tight">
                {competition.name.toUpperCase()}
              </h1>
              <p className="text-sm sm:text-base text-neutral-400 font-sans leading-relaxed">
                {competition.shortDescription}
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/register">
                <Button className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white font-heading font-bold text-sm px-8 py-4 h-auto rounded-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98]">
                  Register Your Team
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Main Info Tabs (Left Column - 70%) */}
          <div className="grow w-full lg:w-0 space-y-6">
            {/* Tabs Selector */}
            <div className="flex border-b border-neutral-850 overflow-x-auto gap-2">
              {(["overview", "rules", "timeline", "prizes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-xs font-bold font-sans uppercase tracking-widest transition-colors border-b-2 outline-none ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="bg-neutral-900/20 border border-neutral-850 p-6 md:p-8 rounded-xl font-sans leading-relaxed text-neutral-300">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-primary" />
                    <h3 className="font-heading text-xl font-extrabold text-neutral-200">Exhibition Overview</h3>
                  </div>
                  <p className="text-neutral-400 text-sm sm:text-base">{competition.description}</p>
                  <div className="space-y-4 mt-6 border-t border-neutral-850/60 pt-6">
                    <h4 className="font-heading text-sm font-bold text-primary uppercase">Key Highlights</h4>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-4">
                        <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-neutral-200 block text-sm">Cloud Credits Eligible</strong>
                          <span className="text-neutral-400 text-xs sm:text-sm">Teams successfully passing Phase 1 receive credits for system deployment and staging.</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-neutral-200 block text-sm">Mentorship Guidance</strong>
                          <span className="text-neutral-400 text-xs sm:text-sm">Interact directly with department advisors and alumni software engineering experts.</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "rules" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
                    <h3 className="font-heading text-xl font-extrabold text-neutral-200">Competition Rules & Regulation</h3>
                    {competition.rulebookUrl && (
                      <a
                        href={competition.rulebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" className="text-xs font-sans border border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:text-neutral-100 py-1.5 h-auto">
                          Open Rulebook in Drive
                        </Button>
                      </a>
                    )}
                  </div>
                  
                  {competition.rulebookUrl ? (
                    <div className="space-y-6">
                      <p className="text-neutral-400 text-xs sm:text-sm">
                        Please review the embedded official rulebook PDF below. You can also view it in full screen using the link above.
                      </p>
                      <div className="w-full aspect-[4/3] sm:aspect-[16/10] rounded-xl overflow-hidden border border-neutral-850 bg-neutral-950/80 relative">
                        <iframe
                          src={getEmbedUrl(competition.rulebookUrl)}
                          className="w-full h-full border-0"
                          allow="autoplay"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ul className="list-disc list-inside space-y-3.5 text-neutral-300 text-xs sm:text-sm">
                        <li>Projects must be original software or hardware systems.</li>
                        <li>Plagiarism or using pre-compiled templates will result in instant disqualification.</li>
                        <li>One user can register in only one team for this competition.</li>
                        <li>Submissions must be uploaded as a PDF report with an optional demo video before the deadline.</li>
                        <li>All team members must complete student profile verification prior to registration.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-10">
                  <h3 className="font-heading text-xl font-extrabold text-neutral-200">Competition Roadmap</h3>
                  <div className="relative space-y-8">
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-neutral-800" />
                    
                    <div className="relative flex items-start gap-6 pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full border border-primary/50 bg-background flex items-center justify-center text-primary z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-primary font-bold uppercase">Phase 01</span>
                        <h4 className="font-heading text-lg font-bold text-neutral-200 mt-0.5">Registration & Roster</h4>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">Submit your team project report PDF and optional demo video.</p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-6 pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full border border-neutral-800 bg-background flex items-center justify-center text-neutral-600 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-neutral-500 font-bold uppercase">Phase 02</span>
                        <h4 className="font-heading text-lg font-bold text-neutral-200 mt-0.5">Abstract Screening</h4>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">Jury screens abstracts to select finalists for offline showcases.</p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-6 pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full border border-neutral-800 bg-background flex items-center justify-center text-neutral-600 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-neutral-500 font-bold uppercase">Phase 03</span>
                        <h4 className="font-heading text-lg font-bold text-neutral-200 mt-0.5">Final Showcase & Demo</h4>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">Live presentation and prototyping demo rounds at SMUCT Campus.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "prizes" && (
                <div className="space-y-6">
                  <h3 className="font-heading text-xl font-extrabold text-neutral-200">Reward Pool Split</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    <div className="bg-neutral-950 border border-neutral-850 p-6 rounded-2xl border-t-4 border-t-gold/50 flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-normal">
                      <Trophy className="h-10 w-10 text-gold" />
                      <div>
                        <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-neutral-500">Champion</h5>
                        <div className="font-mono text-xl font-black text-neutral-100 mt-1">{competition.championPrize}</div>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-normal">Certificate + Team Delegate Kit</p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 p-6 rounded-2xl border-t-4 border-t-silver/50 flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-normal">
                      <Trophy className="h-10 w-10 text-silver" />
                      <div>
                        <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-neutral-500">Runner Up</h5>
                        <div className="font-mono text-xl font-black text-neutral-100 mt-1">{competition.runnerUpPrize}</div>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-normal">Certificate + Team Vouchers</p>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-850 p-6 rounded-2xl border-t-4 border-t-bronze/50 flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-normal">
                      <Trophy className="h-10 w-10 text-bronze" />
                      <div>
                        <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-neutral-500">2nd Runner Up</h5>
                        <div className="font-mono text-xl font-black text-neutral-100 mt-1">{competition.secondRunnerUp}</div>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-normal">Certificate + Tech Perks</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Widgets (Right Column - 30% Sticky) */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-850 rounded-2xl p-6 space-y-6">
              <h3 className="font-heading text-lg font-bold text-neutral-200 border-b border-neutral-850 pb-4">
                Competition Brief
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-850 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono font-bold">Entry Fee</div>
                    <div className="text-neutral-200 font-semibold text-sm">{competition.fee}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-850 flex items-center justify-center">
                    <Users className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono font-bold">Team Size</div>
                    <div className="text-neutral-200 font-semibold text-sm">{competition.teamSize}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-850 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono font-bold">Eligibility</div>
                    <div className="text-neutral-200 font-semibold text-sm capitalize">{competition.eligibility} Only</div>
                  </div>
                </div>
              </div>

              <Link href="/register">
                <Button className="w-full bg-primary hover:bg-primary/95 text-white font-sans font-bold text-xs uppercase tracking-widest py-3 h-auto rounded-lg">
                  Apply to Participate
                </Button>
              </Link>
            </div>

            {/* Support Helper Widget */}
            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-850 rounded-2xl p-5 flex items-center gap-4 hover:bg-neutral-900/80 transition-colors cursor-pointer">
              <HelpCircle className="h-5 w-5 text-primary" />
              <div>
                <h4 className="font-sans text-xs font-bold text-neutral-200">Need Assistance?</h4>
                <p className="text-[10px] text-neutral-500">Contact our coordination desk</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
