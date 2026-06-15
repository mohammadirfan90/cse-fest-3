"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Badge } from "@/components/ui/badge";

interface ScheduleItem {
  time: string;
  name: string;
  type: string;
  venue: string;
  notes: string;
  status: "scheduled" | "live" | "completed";
}

const DAY_1_SCHEDULE: ScheduleItem[] = [
  {
    time: "08:30 AM - 09:30 AM",
    name: "Participant Check-In & Kit Distribution",
    type: "General",
    venue: "Main Campus Lobby",
    notes: "Verification of Student ID is required. Roster kit includes food coupons & delegate pass.",
    status: "scheduled",
  },
  {
    time: "09:30 AM - 10:30 AM",
    name: "CSE Fest 2026 Opening Ceremony",
    type: "Ceremony",
    venue: "Main Auditorium",
    notes: "Inaugural speech by the Department Head and Chief Guest panel.",
    status: "scheduled",
  },
  {
    time: "10:30 AM - 01:30 PM",
    name: "Competitive Programming Contest (Offline)",
    type: "Contest",
    venue: "CP Lab (Room 402)",
    notes: "3-hour IOI Standard competitive coding combat. Internet access will be locked.",
    status: "scheduled",
  },
  {
    time: "10:30 AM - 01:30 PM",
    name: "Software & IoT Showcase Round 1",
    type: "Showcase",
    venue: "Showcase Hall (Room 301)",
    notes: "Internal project staging & visual demonstrations to jury team.",
    status: "scheduled",
  },
  {
    time: "01:30 PM - 02:30 PM",
    name: "Lunch & Prayer Break",
    type: "General",
    venue: "Student Cafeteria",
    notes: "Catered lunch box. Networking session with alumni and sponsors.",
    status: "scheduled",
  },
  {
    time: "02:30 PM - 04:30 PM",
    name: "Showcase Final Pitching Rounds",
    type: "Showcase",
    venue: "Main Auditorium",
    notes: "Top 5 teams pitch live on stage. 5-minute presentation + 3-minute Q&A.",
    status: "scheduled",
  },
  {
    time: "02:30 PM - 05:00 PM",
    name: "E-Sports Valorant Finals",
    type: "Gaming",
    venue: "Gaming Arena (Room 105)",
    notes: "Best of 3 offline match. Live stream with active commentators.",
    status: "scheduled",
  },
  {
    time: "05:00 PM - 06:00 PM",
    name: "Closing & Award Ceremony",
    type: "Ceremony",
    venue: "Main Auditorium",
    notes: "Prize distribution, certificates delivery, and vote of thanks.",
    status: "scheduled",
  },
];

const PRE_FEST_SCHEDULE: ScheduleItem[] = [
  {
    time: "July 12, 2026",
    name: "Capture The Flag (CTF) Online Round",
    type: "Contest",
    venue: "CTF Portal (Online)",
    notes: "12-hour Jeopardy style hacking contest. Top teams advance to finals.",
    status: "completed",
  },
  {
    time: "July 14, 2026",
    name: "Datathon Dataset Release",
    type: "Contest",
    venue: "SWR Platform (Online)",
    notes: "Release of datasets and problem brief. Teams have 48 hours to submit initial notebook.",
    status: "completed",
  },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = React.useState<"day1" | "prefest">("day1");

  const activeSchedule = activeTab === "day1" ? DAY_1_SCHEDULE : PRE_FEST_SCHEDULE;

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background selection:bg-primary/30 bg-grid-pattern">
      <Navbar />

      <main className="flex-grow pt-16 pb-20 px-4 md:px-16 max-w-[1280px] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-6 relative">
          <div className="absolute top-0 right-0 w-[20vw] h-[20vw] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
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
              Schedule & Venue Ledger
            </span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-neutral-100 mb-4">Event Schedules</h1>
          <p className="text-neutral-400 max-w-2xl font-sans text-sm leading-relaxed">
            Plan your attendance. Check out when contests, showcases, and ceremonies are scheduled.
          </p>
        </header>

        {/* Tab Controls */}
        <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-850 p-1.5 rounded-xl mb-8 flex flex-wrap justify-start items-center gap-1.5 w-fit">
          <button
            onClick={() => setActiveTab("day1")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "day1"
                ? "bg-primary text-white shadow-level-1"
                : "bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Day 1 (July 18)</span>
          </button>
          <button
            onClick={() => setActiveTab("prefest")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "prefest"
                ? "bg-primary text-white shadow-level-1"
                : "bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pre-Fest Events</span>
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {/* Desktop Table View */}
            <div className="hidden md:block bg-neutral-900/40 backdrop-blur-md border border-neutral-850 rounded-xl overflow-hidden shadow-level-1">
              <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="border-b border-neutral-850 bg-neutral-900/30 text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-4 font-mono w-48">Time Slot</th>
                    <th className="p-4">Event Name</th>
                    <th className="p-4 w-28">Type</th>
                    <th className="p-4 w-52">Venue</th>
                    <th className="p-4 text-right w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850/50">
                  {activeSchedule.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/20 transition-colors">
                      <td className="p-4 font-mono font-semibold text-primary">
                        {item.time}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-neutral-100">{item.name}</div>
                          <div className="text-xs text-neutral-400 leading-relaxed max-w-lg">{item.notes}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="neutral" className="uppercase text-sm font-mono font-bold tracking-wider px-2 py-0.5">
                          {item.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-secondary shrink-0" />
                          <span className="truncate">{item.venue}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Badge
                          variant={
                            item.status === "live"
                              ? "accent"
                              : item.status === "completed"
                              ? "success"
                              : "neutral"
                          }
                          className="capitalize text-sm font-bold"
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout (Viewports < 768px) */}
            <div className="md:hidden space-y-6">
              {activeSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/40 backdrop-blur-md border border-neutral-850 p-6 rounded-xl space-y-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-primary block">{item.time}</span>
                      <h3 className="font-heading font-extrabold text-base text-neutral-100">{item.name}</h3>
                    </div>
                    <Badge
                      variant={
                        item.status === "live"
                          ? "accent"
                          : item.status === "completed"
                          ? "success"
                          : "neutral"
                      }
                      className="capitalize shrink-0 text-sm font-bold"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">{item.notes}</p>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-850/60 justify-between items-center text-xs">
                    <div className="flex items-center gap-1 text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>{item.venue}</span>
                    </div>
                    <Badge variant="neutral" className="uppercase text-sm font-mono font-bold tracking-wider">
                      {item.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

