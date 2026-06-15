"use client";

import * as React from "react";
import { Megaphone } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TickerData {
  message: string;
}

export function NewsTicker() {
  const { data } = useSWR("/api/public/cms/ticker", fetcher);
  const badgeRef = React.useRef<HTMLDivElement>(null);
  const [badgeWidth, setBadgeWidth] = React.useState(120);

  React.useEffect(() => {
    if (badgeRef.current) {
      setBadgeWidth(badgeRef.current.offsetWidth);
    }
  }, []);

  const tickerItems = React.useMemo(() => {
    if (data && data.success && data.data && data.data.length > 0) {
      return data.data.map((t: TickerData) => t.message);
    }
    return ["Welcome to CSE FEST 2026! Stay tuned for live updates."];
  }, [data]);

  return (
    <div className="relative w-full overflow-hidden bg-neutral-900/60 border-b border-neutral-850 h-10 flex items-center select-none backdrop-blur-md">
      {/* Label Badge — gradient premium treatment */}
      <div
        ref={badgeRef}
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1.5 px-4 border-r border-neutral-850 text-sm font-bold uppercase tracking-widest font-sans shrink-0"
        style={{
          background:
            "linear-gradient(90deg, var(--neutral-900) 80%, transparent)",
          color: "var(--color-accent)",
        }}
      >
        {/* Pulsing live dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <Megaphone className="h-3 w-3" />
        <span>Updates</span>
      </div>

      {/* Right fade-out mask */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to left, var(--neutral-900) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Scrolling Text Container */}
      <div
        className="flex w-full overflow-hidden items-center"
        style={{ paddingLeft: `${badgeWidth + 12}px` }}
      >
        <div className="animate-marquee whitespace-nowrap flex gap-16 text-sm font-medium font-sans text-neutral-400 hover:[animation-play-state:paused] cursor-pointer">
          {/* Repeat items twice to guarantee infinite looping */}
          {tickerItems.map((item: string, idx: number) => (
            <span key={`ticker-1-${idx}`} className="flex items-center gap-2.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" />
              {item}
            </span>
          ))}
          {tickerItems.map((item: string, idx: number) => (
            <span key={`ticker-2-${idx}`} className="flex items-center gap-2.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
