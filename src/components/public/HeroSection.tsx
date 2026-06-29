"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// â”€â”€â”€ Countdown Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type CountdownTick = { days: number; hours: number; minutes: number; seconds: number };

function useCountdown(target: Date): CountdownTick {
  const calc = React.useCallback((): CountdownTick => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [target]);

  const [t, setT] = React.useState<CountdownTick>(calc);
  React.useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return t;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Track {
  id: string;
  name: string;
  shortName: string;
  category: string;
  prize: string;
  capacity: number;
  status: "ONLINE" | "STANDBY" | "CLOSING";
  description: string;
}

const STATIC_FALLBACK_TRACKS: Track[] = [
  {
    id: "software",
    name: "SOFTWARE SHOWCASE",
    shortName: "SOFT",
    category: "Project Exhibition",
    prize: "50,000 BDT",
    capacity: 85,
    status: "ONLINE",
    description: "Showcase desktop, web, or mobile applications."
  },
  {
    id: "iot",
    name: "IoT SHOWCASE",
    shortName: "IoT",
    category: "Hardware Exhibition",
    prize: "40,000 BDT",
    capacity: 75,
    status: "ONLINE",
    description: "Showcase innovative Internet of Things projects."
  },
  {
    id: "idea",
    name: "IDEA SHOWCASE",
    shortName: "IDEA",
    category: "Pitch Contest",
    prize: "30,000 BDT",
    capacity: 90,
    status: "ONLINE",
    description: "Pitch groundbreaking tech startup concepts."
  },
  {
    id: "cp",
    name: "CP CONTEST",
    shortName: "CP",
    category: "Competitive Programming",
    prize: "35,000 BDT",
    capacity: 95,
    status: "ONLINE",
    description: "Solve complex algorithmic problems under IOI guidelines."
  },
  {
    id: "datathon",
    name: "DATATHON",
    shortName: "DATA",
    category: "Data Science & ML",
    prize: "45,000 BDT",
    capacity: 80,
    status: "STANDBY",
    description: "Build predictive models and extract insights from raw datasets."
  },
  {
    id: "ctf",
    name: "CYBER CTF",
    shortName: "CTF",
    category: "Capture The Flag",
    prize: "35,000 BDT",
    capacity: 70,
    status: "STANDBY",
    description: "Ethical hacking challenges spanning web, rev, and pwn."
  },
  {
    id: "robo",
    name: "ROBO SOCCER",
    shortName: "ROBO",
    category: "Robotics Contest",
    prize: "40,000 BDT",
    capacity: 65,
    status: "ONLINE",
    description: "Design autonomous bots to compete in soccer matches."
  },
  {
    id: "lfr",
    name: "LFR (Line Follower)",
    shortName: "LFR",
    category: "Robotics Contest",
    prize: "30,000 BDT",
    capacity: 88,
    status: "ONLINE",
    description: "Build high-speed line following robots to traverse paths."
  },
  {
    id: "valorant",
    name: "VALORANT SHOWDOWN",
    shortName: "VAL",
    category: "Esports Tournament",
    prize: "25,000 BDT",
    capacity: 100,
    status: "ONLINE",
    description: "5v5 tactical shooter tournament on custom brackets."
  },
  {
    id: "fifa",
    name: "FIFA MAESTROS",
    shortName: "FIFA",
    category: "Esports Tournament",
    prize: "15,000 BDT",
    capacity: 100,
    status: "ONLINE",
    description: "1v1 virtual football matches in console arena."
  }
];

interface DbCompetition {
  id: string;
  name: string;
  type: string;
  status: string;
  shortName?: string;
  short_name?: string;
  prizePool?: string;
  prize_pool?: string;
  heroCapacity?: number;
  hero_capacity?: number;
  shortDescription?: string;
  short_description?: string;
  description?: string;
  showInHero?: boolean;
  show_in_hero?: boolean;
}

function mapDbCompToTrack(comp: DbCompetition): Track {
  let category = comp.type || "Showcase";
  if (comp.type === "Showcase") {
    if (comp.name.toLowerCase().includes("software")) {
      category = "Project Exhibition";
    } else if (comp.name.toLowerCase().includes("iot")) {
      category = "Hardware Exhibition";
    } else if (comp.name.toLowerCase().includes("idea")) {
      category = "Pitch Contest";
    } else {
      category = "Project Showcase";
    }
  } else if (comp.type === "Programming") {
    category = "Competitive Programming";
  } else if (comp.type === "Security") {
    category = "Capture The Flag";
  } else if (comp.type === "Robotics") {
    category = "Robotics Contest";
  } else if (comp.type === "Esports") {
    category = "Esports Tournament";
  } else {
    category = `${comp.type} Contest`;
  }

  let status: "ONLINE" | "STANDBY" | "CLOSING" = "ONLINE";
  if (comp.status === "registration_closed" || comp.status === "archived") {
    status = "CLOSING";
  } else if (comp.status === "published") {
    status = "STANDBY";
  }

  return {
    id: comp.id,
    name: comp.name.toUpperCase(),
    shortName: comp.shortName || comp.short_name || comp.name.slice(0, 4).toUpperCase(),
    category,
    prize: comp.prizePool || comp.prize_pool || "TBD",
    capacity: comp.heroCapacity ?? comp.hero_capacity ?? 80,
    status,
    description: comp.shortDescription || comp.short_description || comp.description || "",
  };
}

// â”€â”€â”€ Actual Technology & Event Logo SVGs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function LogoIcon({ name, className = "", size = 24 }: { name: string; className?: string; size?: number }) {
  const norm = name.toLowerCase().trim();

  // Next.js (Circle shape and N path)
  if (norm.includes("next")) {
    return (
      <svg viewBox="0 0 180 180" width={size} height={size} className={className}>
        <circle cx="90" cy="90" r="90" fill="currentColor" className="opacity-10" />
        <path d="M140 135 L75 52 L60 52 L60 128 L73 128 L73 75 L130 148 Z" fill="white" />
        <rect x="117" y="52" width="13" height="76" fill="white" />
      </svg>
    );
  }

  // React (Orbital electron loops)
  if (norm.includes("react")) {
    return (
      <svg viewBox="-11.5 -10.23 23 20.46" width={size} height={size} className={className} stroke="currentColor" fill="none">
        <circle cx="0" cy="0" r="2.05" fill="currentColor" />
        <g strokeWidth="1">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    );
  }

  // TypeScript (Blue box with TS)
  if (norm.includes("typescript") || norm === "ts") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <rect width="100%" height="100%" fill="currentColor" className="opacity-10" rx="8" />
        <text x="85" y="80" fontFamily="system-ui, sans-serif" fontWeight="bold" fontSize="50" fill="currentColor" textAnchor="end">TS</text>
      </svg>
    );
  }

  // Tailwind CSS (Official double wave waves)
  if (norm.includes("tailwind")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
        <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.335 6.182 14.974 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.335 13.382 8.974 12 6.001 12z" fill="currentColor" />
      </svg>
    );
  }

  // Python (Blue and yellow dual snakes)
  if (norm.includes("python")) {
    return (
      <svg viewBox="0 0 110 110" width={size} height={size} className={className}>
        <path d="M55 5C41.3 5 30.6 8.5 28.5 15.6l2 6.6c0 0 7.9-2.5 19.3-2.5s20.2 6.5 20.2 14.5v9.8H39c-12 0-21.6 7.4-21.6 19.3v11c0 12 9.6 19.3 21.6 19.3h9.8V84c0 12 9.6 21.6 21.6 21.6s21.6-9.6 21.6-21.6v-9.8c12 0 21.6-7.4 21.6-19.3v-11c0-12-9.6-19.3-21.6-19.3H90.2V35.6c0-12-9.6-21.6-21.6-21.6c-4 0-9.6.2-13.6 11zm-9.8 19.6c2.7 0 4.9 2.2 4.9 4.9s-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9zm29.4 49c2.7 0 4.9 2.2 4.9 4.9s-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9z" fill="currentColor" />
      </svg>
    );
  }

  // C++ (Hexagon outline with custom inner text)
  if (norm.includes("c++") || norm === "cpp") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="currentColor" className="opacity-10" stroke="currentColor" strokeWidth="4" />
        <text x="50" y="60" fontFamily="sans-serif" fontWeight="bold" fontSize="34" fill="currentColor" textAnchor="middle">C++</text>
      </svg>
    );
  }

  // HTML5 (Orange shield and inner white shapes)
  if (norm.includes("html")) {
    return (
      <svg viewBox="0 0 512 512" width={size} height={size} className={className}>
        <path d="M108.4 0h295.1l-26.6 448.9-121 34.6-121-34.6z" fill="currentColor" className="opacity-10" stroke="currentColor" strokeWidth="20" />
        <path d="M256 32v415.7l93.7-26.8 21.8-356.2z" fill="currentColor" />
        <path d="M256 166.4H178l5.8 63.8h72.2V320l-71.8-19.4-4.6-51h-33.8l9.2 101 101 28V166.4zm0 0h78.2l-7.2 78.2H256v63.8l72.2-19.4 6.8-78.2h33.8l-12 138-100.8 28.2V166.4z" fill="currentColor" />
      </svg>
    );
  }

  // SQL / Supabase (Amber/Green lightning bolt)
  if (norm.includes("supabase") || norm.includes("sql") || norm.includes("database")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" className="opacity-20" />
      </svg>
    );
  }

  // VALORANT (Official segmented V logo shape)
  if (norm.includes("valorant") || norm === "val") {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="currentColor">
        <path d="M18 16 L45 16 L28 84 L18 84 Z" />
        <path d="M82 16 L60 84 L50 84 L65 48 L82 16 Z" />
        <path d="M52 16 L82 16 L65 48 L55 16 Z" />
      </svg>
    );
  }

  // FIFA (Globe grid/football shape)
  if (norm.includes("fifa")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-10" />
        <path d="M12 2v20M2 12h20M12 2c2.76 0 5 4.48 5 10s-2.24 10-5 10-5-4.48-5-10 2.24-10 5-10z" />
      </svg>
    );
  }

  // Cyber CTF (Segmented flag shape)
  if (norm.includes("ctf") || norm.includes("cyber") || norm.includes("security")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" fill="currentColor" className="opacity-20" />
      </svg>
    );
  }

  // Datathon (AI/Neural connections)
  if (norm.includes("datathon") || norm.includes("data") || norm.includes("ml")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="5" r="2.5" fill="currentColor" className="opacity-20" />
        <circle cx="5" cy="12" r="2.5" fill="currentColor" className="opacity-20" />
        <circle cx="19" cy="12" r="2.5" fill="currentColor" className="opacity-20" />
        <circle cx="12" cy="19" r="2.5" fill="currentColor" className="opacity-20" />
        <path d="M12 7.5v9M7.5 12h9M12 7.5L5 12m14 0l-7-4.5M5 12l7 7m0 0l7-7" />
      </svg>
    );
  }

  // Robo Soccer / LFR / Robotics (Mechanical gear)
  if (norm.includes("robo") || norm.includes("soccer") || norm.includes("lfr") || norm.includes("robotics")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" fill="currentColor" className="opacity-15" />
        <path d="M12 2v20M2 12h20" />
        <path d="M12 12l5-5M12 12L7 7M12 12l5 5M12 12l-5 5" />
      </svg>
    );
  }

  // IoT Showcase (Microcontroller layout)
  if (norm.includes("iot") || norm.includes("hardware")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" className="opacity-15" />
        <path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
      </svg>
    );
  }

  // Idea Showcase / Pitch (Glowing Idea Bulb)
  if (norm.includes("idea") || norm.includes("pitch")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .5 2.2 1.5 3.1.7.7 1.3 1.5 1.5 2.5h6z" fill="currentColor" className="opacity-20" />
        <path d="M9 18h6M10 22h4" />
      </svg>
    );
  }

  // Software Showcase (Interactive desktop dashboard layout fallback)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" className="opacity-10" />
      <path d="M8 21h8M12 17v4M6 8l4 4-4 4" />
    </svg>
  );
}

interface FloatingIconItem {
  name: string;
  color: string;
  x: string;
  y: string;
  delay: number;
  duration: number;
  size: number;
}

const FLOATING_ICONS: FloatingIconItem[] = [
  { name: "Next.js", color: "text-neutral-600/5", x: "8%", y: "15%", delay: 0.5, duration: 14, size: 24 },
  { name: "TypeScript", color: "text-neutral-600/5", x: "85%", y: "10%", delay: 1.2, duration: 16, size: 20 },
  { name: "React.js", color: "text-primary/5", x: "45%", y: "6%", delay: 0.2, duration: 12, size: 28 },
  { name: "Tailwind CSS v4", color: "text-secondary/5", x: "15%", y: "85%", delay: 2.1, duration: 15, size: 22 },
  { name: "Python", color: "text-neutral-600/5", x: "88%", y: "82%", delay: 0.8, duration: 18, size: 26 },
  { name: "C++", color: "text-accent/5", x: "32%", y: "88%", delay: 1.5, duration: 13, size: 22 },
  { name: "HTML5", color: "text-neutral-600/5", x: "5%", y: "52%", delay: 2.8, duration: 17, size: 20 },
  { name: "SQL / Supabase", color: "text-accent/5", x: "90%", y: "45%", delay: 0.4, duration: 14, size: 24 },
  { name: "VALORANT", color: "text-secondary/5", x: "25%", y: "22%", delay: 1.0, duration: 16, size: 30 },
  { name: "FIFA", color: "text-primary/5", x: "72%", y: "15%", delay: 1.8, duration: 15, size: 26 },
  { name: "CYBER CTF", color: "text-neutral-600/5", x: "42%", y: "80%", delay: 0.5, duration: 14, size: 28 },
  { name: "DATATHON", color: "text-primary/5", x: "80%", y: "70%", delay: 2.5, duration: 16, size: 24 },
  { name: "ROBO SOCCER", color: "text-accent/5", x: "18%", y: "78%", delay: 1.3, duration: 13, size: 28 },
  { name: "LFR RACING", color: "text-secondary/5", x: "92%", y: "30%", delay: 0.7, duration: 15, size: 22 },
  { name: "IDEA PITCH", color: "text-neutral-600/5", x: "65%", y: "86%", delay: 1.7, duration: 17, size: 24 },
];

export function HeroSection() {
  const FESTIVAL_DATE = React.useMemo(() => new Date("2026-07-18T09:00:00+06:00"), []);
  const timeLeft = useCountdown(FESTIVAL_DATE);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const padZero = (num: number) => String(num).padStart(2, "0");

  return (
    <section className="relative z-10 max-w-[1280px] mx-auto px-4 md:px-16 pt-4 pb-12 md:pt-8 md:pb-20 flex flex-col items-center justify-center gap-10 min-h-[500px] md:min-h-[600px] text-center">
      {/* Background Floating Tech & Competition Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {FLOATING_ICONS.map((item, idx) => {
          return (
            <motion.div
              key={idx}
              className={`absolute ${item.color} select-none`}
              style={{ left: item.x, top: item.y }}
              animate={{
                y: [0, -20, 15, -15, 0],
                x: [0, 12, -18, 10, 0],
                rotate: [0, 45, -45, 90, 0],
                scale: [0.95, 1.1, 0.9, 1.05, 0.95],
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: item.delay,
              }}
            >
              <LogoIcon name={item.name} size={item.size} />
            </motion.div>
          );
        })}
      </div>

      {/* Banner Landscape (Centered) */}
      <div className="relative w-full max-w-4xl aspect-[1200/630] rounded-2xl overflow-hidden border border-primary/20 bg-neutral-950/40 backdrop-blur-xl shadow-level-4 group transition-all duration-500 hover:border-primary/45 hover:shadow-[0_0_35px_rgba(146,80,255,0.25)] z-10 animate-fade-in">
        {/* Ambient aura background */}
        <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-complex pointer-events-none" />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />

        {/* Dynamic scan line animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="w-full h-[2px] bg-primary/20 animate-scan-line opacity-30 shadow-[0_0_10px_rgba(146,80,255,0.6)]" />
        </div>

        {/* Banner Image */}
        <Image
          src="/webbannerv2.png"
          alt="SMUCT CSE Fest 2026 Banner"
          fill
          priority
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>

      {/* Countdown & Register Button Container */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md z-10">
        {/* Dynamic Countdown */}
        {mounted ? (
          <div className="relative w-full p-6 bg-glass border border-glass rounded-2xl shadow-level-4 group animate-fade-up">
            {/* Rotating coordinates ring inside card background */}
            <div className="absolute inset-0 border border-accent/10 rounded-2xl pointer-events-none animate-pulse" />
            <div className="absolute -inset-2 border border-dashed border-primary/10 rounded-[20px] pointer-events-none animate-[spin_60s_linear_infinite]" />
            
            <div className="grid grid-cols-4 gap-3 font-mono select-none relative z-10">
              <div className="bg-neutral-950/40 border border-neutral-850/80 p-3 rounded-xl text-center backdrop-blur-md group-hover:border-primary/45 transition-colors duration-normal">
                <div className="text-2xl font-black text-neutral-100 tracking-tight">{padZero(timeLeft.days)}</div>
                <div className="text-sm uppercase tracking-widest text-neutral-50 font-sans font-bold mt-1">Days</div>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-850/80 p-3 rounded-xl text-center backdrop-blur-md group-hover:border-primary/45 transition-colors duration-normal">
                <div className="text-2xl font-black text-neutral-100 tracking-tight">{padZero(timeLeft.hours)}</div>
                <div className="text-sm uppercase tracking-widest text-neutral-50 font-sans font-bold mt-1">Hrs</div>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-850/80 p-3 rounded-xl text-center backdrop-blur-md group-hover:border-primary/45 transition-colors duration-normal">
                <div className="text-2xl font-black text-neutral-100 tracking-tight">{padZero(timeLeft.minutes)}</div>
                <div className="text-sm uppercase tracking-widest text-neutral-50 font-sans font-bold mt-1">Mins</div>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-850/80 p-3 rounded-xl text-center backdrop-blur-md group-hover:border-primary/45 transition-colors duration-normal">
                <div className="text-2xl font-black text-neutral-100 tracking-tight">{padZero(timeLeft.seconds)}</div>
                <div className="text-sm uppercase tracking-widest text-neutral-50 font-sans font-bold mt-1">Secs</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-28 w-full bg-neutral-900/30 rounded-2xl animate-pulse" />
        )}

        <div className="flex justify-center w-full animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Link href="/competitions" className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/95 text-white font-heading text-lg font-bold px-12 py-4 h-auto rounded-md hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-[0.98]">
              Register Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

