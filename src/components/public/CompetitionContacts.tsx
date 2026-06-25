"use client";

import * as React from "react";
import useSWR from "swr";
import { Phone, User, Trophy, ShieldCheck, Sparkles } from "lucide-react";
import { getCompetitionContact } from "@/constants/contacts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Competition {
  id: string;
  name: string;
  eligibility: string;
  slug?: string;
}

export function CompetitionContacts() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { data, error, isLoading } = useSWR<{ success: boolean; data: Competition[] }>(
    mounted ? "/api/public/competitions" : null,
    fetcher
  );

  const processedCompetitions = React.useMemo(() => {
    if (!data?.success || !Array.isArray(data.data)) return [];
    
    // Sort so eligibility === "both" comes first (matches homepage order)
    return [...data.data].sort((a, b) => {
      const eligibilityA = a.eligibility?.toLowerCase();
      const eligibilityB = b.eligibility?.toLowerCase();
      
      if (eligibilityA === "both" && eligibilityB !== "both") return -1;
      if (eligibilityA !== "both" && eligibilityB === "both") return 1;
      return 0;
    });
  }, [data]);

  if (!mounted) return null;

  return (
    <section id="contacts" className="max-w-[1280px] mx-auto px-4 md:px-16 py-16 border-t border-neutral-200 dark:border-neutral-850/50 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-[90px] pointer-events-none z-0" />

      {/* Heading */}
      <div className="mb-12 relative z-10">
        <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
          <ShieldCheck className="h-4 w-4 text-primary animate-pulse" />
          <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
            Support Desk
          </span>
        </div>
        <h2 className="font-heading text-3xl md:text-4xl font-black text-[#111827] dark:text-neutral-100 tracking-tight text-center md:text-left">
          Event Coordination Contacts
        </h2>
        <p className="text-xs sm:text-sm text-[#4B5563] dark:text-neutral-500 font-sans mt-2 max-w-2xl text-center md:text-left">
          Reach out to the segment coordinators directly for questions regarding registration, guidelines, and rules.
        </p>
      </div>

      {/* Table Container */}
      <div className="relative z-10 bg-white/80 dark:bg-[#12141a]/80 border border-neutral-200/80 dark:border-primary/15 rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(139,92,246,0.04),0_2px_8px_rgba(0,0,0,0.04)] select-text">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-850">
              <div className="bg-neutral-50 dark:bg-neutral-900/40 px-6 py-4 flex gap-4">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-5 flex gap-4">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 w-1/3 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : error || processedCompetitions.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-extrabold text-lg text-neutral-800 dark:text-neutral-300">Coordinators Unassigned</h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-sm leading-relaxed">
                Contact assignments will be published shortly. For immediate assistance, dial <strong>+8801937309224</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <table className="hidden md:table min-w-full divide-y divide-neutral-200/60 dark:divide-neutral-850/60 text-left">
                <thead className="bg-[#FAF8FF] dark:bg-neutral-900/40">
                  <tr>
                    <th scope="col" className="px-6 py-4.5 font-heading text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Segment
                    </th>
                    <th scope="col" className="px-6 py-4.5 font-heading text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Coordinator
                    </th>
                    <th scope="col" className="px-6 py-4.5 font-heading text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Phone Number
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-850/50 bg-white/40 dark:bg-[#12141a]/40">
                  {processedCompetitions.map((comp) => {
                    const contact = getCompetitionContact(comp);
                    return (
                      <tr
                        key={comp.id}
                        className="group/row hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors duration-normal"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/row:scale-105 transition-transform">
                              <Trophy className="h-4 w-4" />
                            </div>
                            <span className="font-heading font-extrabold text-neutral-800 dark:text-neutral-200 text-base">
                              {comp.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#8B5CF6] dark:text-[#A78BFA] opacity-80" />
                            <span className="font-sans font-semibold text-neutral-700 dark:text-neutral-300 text-sm">
                              {contact.coordinator}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <a
                            href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-glass bg-background/50 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/35 dark:hover:border-[#8B5CF6]/30 text-neutral-600 dark:text-neutral-300 hover:text-[#8B5CF6] dark:hover:text-[#A78BFA] transition-all duration-normal font-mono text-sm group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Phone className="h-3.5 w-3.5 text-neutral-400 group-hover/btn:text-[#8B5CF6] dark:group-hover/btn:text-[#A78BFA] transition-colors" />
                            <span>{contact.phone}</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-neutral-200/60 dark:divide-neutral-850/60 bg-white/40 dark:bg-[#12141a]/40">
                {processedCompetitions.map((comp) => {
                  const contact = getCompetitionContact(comp);
                  return (
                    <div key={comp.id} className="p-5 space-y-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <span className="font-heading font-extrabold text-neutral-800 dark:text-neutral-200 text-base">
                          {comp.name}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#8B5CF6] dark:text-[#A78BFA] opacity-80" />
                          <span className="font-sans font-semibold text-neutral-700 dark:text-neutral-300 text-sm">
                            {contact.coordinator}
                          </span>
                        </div>
                        
                        <a
                          href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-glass bg-background/50 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/35 dark:hover:border-[#8B5CF6]/30 text-neutral-600 dark:text-neutral-300 hover:text-[#8B5CF6] dark:hover:text-[#A78BFA] transition-all duration-normal font-mono text-sm group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          <Phone className="h-3.5 w-3.5 text-neutral-400 group-hover/btn:text-[#8B5CF6] dark:group-hover/btn:text-[#A78BFA] transition-colors" />
                          <span>{contact.phone}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
