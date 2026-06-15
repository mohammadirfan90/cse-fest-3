"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, Circle, Sparkles } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Competition {
  registrationStart: string;
  registrationEnd: string;
  submissionStart: string;
  submissionEnd: string;
}

export function Timeline() {
  const [mounted, setMounted] = React.useState(false);
  const { data, isLoading } = useSWR<{ success: boolean; data: Competition[] }>(
    "/api/public/competitions",
    fetcher
  );

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const competitions = React.useMemo(() => (data?.success ? data.data : []), [data]);

  const timelineItems = React.useMemo(() => {
    if (!competitions || competitions.length === 0) return [];

    // Find earliest and latest dates
    let earliestRegStart = new Date(competitions[0].registrationStart);
    let earliestRegEnd = new Date(competitions[0].registrationEnd);
    let earliestSubStart = new Date(competitions[0].submissionStart);
    let earliestSubEnd = new Date(competitions[0].submissionEnd);

    competitions.forEach((c) => {
      const rs = new Date(c.registrationStart);
      const re = new Date(c.registrationEnd);
      const ss = new Date(c.submissionStart);
      const se = new Date(c.submissionEnd);

      if (rs < earliestRegStart) earliestRegStart = rs;
      if (re < earliestRegEnd) earliestRegEnd = re;
      if (ss < earliestSubStart) earliestSubStart = ss;
      if (se < earliestSubEnd) earliestSubEnd = se;
    });

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    return [
      {
        date: "17 June",
        title: "Registration Launch",
        description: "Phase 1 free registration and team formation portal opens for all showcases.",
      },
      {
        date: "3 July",
        title: "Registration Deadline",
        description: "Initial proposal submission (PDF/Video format) closes for external events.",
      },
      {
        date: "7 July",
        title: "Onsite Selection & Fee payment",
        description: "Onsite teams published and fee payment",
      },
      {
        date: "10 July",
        title: "Finalist Announcement",
        description: "Official announcement of teams shortlisted for the final showcase.",
      },
      {
        date: "July 18, 2026",
        title: "Festival Day",
        description: "Offline showcase demonstrations, programming contests, and presentation sessions.",
      },
    ];
  }, [competitions]);

  if (!mounted || isLoading) {
    return (
      <section id="timeline" className="max-w-[1280px] mx-auto px-4 md:px-16 py-24 border-t border-neutral-850 animate-pulse">
        <div className="h-6 bg-neutral-900 w-32 mx-auto rounded mb-3" />
        <div className="h-10 bg-neutral-900 w-64 mx-auto rounded mb-12" />
        <div className="space-y-8 max-w-lg mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-900/40 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  // Show empty state if there are no published competitions
  if (timelineItems.length === 0) {
    return (
      <section id="timeline" className="max-w-[1280px] mx-auto px-4 md:px-16 py-24 border-t border-neutral-850 relative">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-[2px] w-8 bg-primary" />
            <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
              Roadmap to Glory
            </span>
            <div className="h-[2px] w-8 bg-primary" />
          </div>
          <h2 className="font-heading text-4xl font-extrabold text-neutral-100">Festival Roadmap</h2>
        </div>
        <div className="py-16 text-center rounded-xl border border-dashed border-neutral-850 bg-neutral-900/10 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-extrabold text-lg text-neutral-300">Roadmap Updates Coming Soon</h3>
          <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-sm leading-relaxed">
            Specific timeline dates will be populated as soon as the first competitions are published by organizers.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="timeline" className="max-w-[1280px] mx-auto px-4 md:px-16 py-24 border-t border-neutral-850 relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-20 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-[2px] w-8 bg-primary" />
          <span className="font-sans text-xs font-bold text-primary tracking-widest uppercase">
            Roadmap to Glory
          </span>
          <div className="h-[2px] w-8 bg-primary" />
        </div>
        <h2 className="font-heading text-4xl md:text-5xl font-black text-neutral-100 tracking-tight">
          Festival Roadmap
        </h2>
        <p className="text-neutral-400 font-sans text-sm max-w-lg mx-auto mt-2.5">
          Mark your calendars. Follow the key stages from registration to the live showcase.
        </p>
      </div>

      {/* Timeline Layout */}
      <div className="relative max-w-4xl mx-auto z-10">
        {/* Central Vertical Connector Line */}
        <div className="absolute left-4 md:left-1/2 top-4 bottom-4 w-[2px] bg-neutral-800 -translate-x-1/2" />

        {/* Animated Progress Overlay Line */}
        <motion.div
          className="absolute left-4 md:left-1/2 top-4 bottom-4 w-[2px] bg-linear-to-b from-primary via-secondary to-accent origin-top -translate-x-1/2"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Timeline Items */}
        <div className="space-y-12">
          {timelineItems.map((item, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <motion.div
                key={idx}
                className={`relative flex flex-col md:flex-row items-start ${
                  isEven ? "md:flex-row-reverse" : ""
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                {/* Visual Connector Dot */}
                <motion.div
                  whileInView={{
                    borderColor: ["var(--color-neutral-850)", "var(--color-primary)", "var(--color-secondary)", "var(--color-neutral-850)"],
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: idx * 0.15 }}
                  className="absolute left-4 md:left-1/2 w-8 h-8 rounded-full bg-neutral-950 border-2 border-neutral-850 flex items-center justify-center -translate-x-1/2 z-20"
                >
                  <motion.div
                    whileInView={{
                      scale: [1, 1.2, 1],
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: idx * 0.15 }}
                    className="w-3.5 h-3.5 rounded-full bg-neutral-800 flex items-center justify-center"
                  >
                    <Circle className="w-1.5 h-1.5 fill-primary stroke-none text-primary" />
                  </motion.div>
                </motion.div>

                {/* Left/Right Card Spacer for Grid Alignment */}
                <div className="hidden md:block md:w-1/2" />

                {/* Card Wrapper (takes up remaining half on desktop, full-width on mobile) */}
                <div className={`w-full md:w-1/2 pl-12 pr-4 md:px-0 ${isEven ? "md:pl-0 md:pr-10" : "md:pl-10 md:pr-0"}`}>
                  <div className="bg-glass border border-glass p-6 md:p-8 rounded-2xl hover:border-primary/40 hover:-translate-y-1.5 hover:shadow-level-3 transition-all duration-normal group cursor-pointer relative overflow-hidden">
                    {/* Hover Glow Accent Corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-normal" />
                    
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40 transition-all duration-300 group-hover:w-4 group-hover:h-4" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent/40 transition-all duration-300 group-hover:w-4 group-hover:h-4" />

                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-accent animate-pulse" />
                      <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                        {item.date}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-neutral-200 group-hover:text-neutral-50 transition-colors mb-2">
                      {item.title}
                    </h3>
                    <p className="text-neutral-400 font-sans text-xs sm:text-sm leading-relaxed font-light">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
