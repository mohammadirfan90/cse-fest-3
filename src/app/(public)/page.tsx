"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Megaphone, Sparkles } from "lucide-react";
import useSWR from "swr";
import { Navbar } from "@/components/shared/Navbar";
import { NewsTicker } from "@/components/public/NewsTicker";
import { HeroSection } from "@/components/public/HeroSection";
import { FeaturedCompetitions } from "@/components/public/FeaturedCompetitions";
import { Timeline } from "@/components/public/Timeline";
import { Footer } from "@/components/shared/Footer";

const FACEBOOK_EVENT_URL = "https://www.facebook.com/share/1Jc9XUgt5R/";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function FacebookEventBanner() {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Lightweight analytics hook — fires only if a GTM/GA4 dataLayer exists.
    // No new dependency added; safe to no-op in environments without it.
    const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
    w.dataLayer?.push({
      event: "social_click",
      social_platform: "facebook",
      social_action: "rsvp_event",
      social_url: FACEBOOK_EVENT_URL,
      outbound: true,
    });
  };

  return (
    <section
      id="facebook-event"
      aria-labelledby="facebook-event-heading"
      className="max-w-7xl mx-auto px-4 md:px-16 py-20 border-t border-neutral-850 relative"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Aurora blobs — match the Hero style, but kept low-opacity so the card
            stays the focus. Pointer-events-none so clicks still hit the anchor. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8 md:-inset-12 overflow-visible"
        >
          <div className="absolute -top-12 -left-10 w-72 h-72 rounded-full bg-primary/30 mix-blend-screen filter blur-3xl opacity-30 dark:opacity-50 animate-blob" />
          <div
            className="absolute -bottom-16 -right-10 w-80 h-80 rounded-full bg-tertiary/30 mix-blend-screen filter blur-3xl opacity-25 dark:opacity-40 animate-blob"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-24 rounded-full bg-secondary/20 mix-blend-screen filter blur-3xl opacity-20 dark:opacity-30 animate-blob"
            style={{ animationDelay: "4s" }}
          />
        </div>

        {/* Holographic conic outline — only on dark, slowly rotating. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 dark:opacity-100 overflow-hidden"
        >
          <div
            className="absolute inset-[-50%] animate-[fb-spin_8s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(99,102,241,0.55) 60deg, transparent 120deg, rgba(236,72,153,0.45) 200deg, transparent 260deg, rgba(34,211,238,0.5) 320deg, transparent 360deg)",
            }}
          />
          <div
            className="absolute inset-px rounded-2xl"
            style={{ background: "var(--background, #0a0a0a)" }}
          />
        </div>

        <a
          href={FACEBOOK_EVENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          data-social="facebook"
          data-action="rsvp_event"
          aria-describedby="facebook-event-heading"
          className="group relative block rounded-2xl border border-glass bg-glass backdrop-blur-md p-8 md:p-12 transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.005] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_20px_60px_-20px_rgba(99,102,241,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {/* Inner radial sheen — picks up on hover via group */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "radial-gradient(800px circle at var(--mx,50%) var(--my,50%), rgba(99,102,241,0.10), transparent 40%)",
            }}
          />

          {/* Breathing primary glow — only on dark, only on the resting state. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 rounded-3xl opacity-0 dark:opacity-60 group-hover:opacity-0 transition-opacity duration-300 animate-[fb-pulse_4s_ease-in-out_infinite]"
            style={{
              boxShadow: "0 0 60px -10px rgba(99,102,241,0.45)",
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
                <span className="relative inline-block w-2 h-2 rounded-full bg-primary mr-2 align-middle">
                  <span className="absolute inset-0 rounded-full bg-primary/60 animate-ping" />
                </span>
                Stay Connected
              </p>
              <h2
                id="facebook-event-heading"
                className="font-heading text-2xl md:text-3xl font-extrabold text-neutral-100 tracking-tight"
              >
                Join the official{" "}
                <span className="bg-linear-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
                  CSE Fest 2026
                </span>{" "}
                Facebook event
              </h2>
              <p className="text-sm md:text-base text-neutral-400 font-light leading-relaxed">
                Get reminders, announcements, and live updates straight from the organizers.
              </p>
            </div>

            <span className="relative inline-flex items-center justify-center gap-2 self-start md:self-auto whitespace-nowrap rounded-full border border-glass bg-background/40 group-hover:bg-primary/10 group-hover:border-primary/50 group-hover:shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)] transition-all duration-normal px-6 py-3 text-sm font-semibold text-neutral-100">
              <Megaphone className="h-4 w-4 text-primary group-hover:rotate-12 group-hover:scale-110 transition-transform duration-normal" />
              Facebook Event
              <span
                aria-hidden="true"
                className="inline-block text-neutral-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-normal"
              >
                →
              </span>
            </span>
          </div>
        </a>
      </motion.div>
    </section>
  );
}

interface FAQData {
  question: string;
  answer: string;
}

export default function PublicHomePage() {
  const [activeFaqIndex, setActiveFaqIndex] = React.useState<number | null>(null);
  const { data } = useSWR("/api/public/cms/faqs", fetcher);

  const faqList = React.useMemo<FAQData[]>(() => {
    if (data?.success && data?.data?.length > 0) return data.data as FAQData[];
    return [];
  }, [data]);

  const toggleFaq = (index: number) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background font-sans select-text relative">
      
      {/* Background Decorative Lines */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] dark:opacity-[0.08]" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full border-l border-neutral-100/10"></div>
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-neutral-100/10 to-transparent"></div>
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-neutral-100/10 to-transparent"></div>
        <svg className="absolute w-full h-full inset-0" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1"></line>
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1"></line>
        </svg>
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Scrolling News Ticker */}
      <NewsTicker />

      {/* Hero Section with Countdown & Cyber Console */}
      <main className="pt-4 relative min-h-screen bg-grid-pattern overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-tertiary/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-secondary/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "4s" }} />
        </div>

        {/* Hero Section */}
        <HeroSection />


        {/* Competitions Section */}
        <FeaturedCompetitions />

        {/* Timeline Section */}
        <Timeline />

        {/* FAQ Section */}
        <section id="faq" className="max-w-[1280px] mx-auto px-4 md:px-16 py-28 border-t border-neutral-850 relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute top-6 right-6 select-none pointer-events-none z-0 text-right">
            <h2 className="text-[100px] md:text-[160px] font-black text-neutral-100 opacity-[0.02] tracking-tighter leading-none font-heading uppercase">
              FAQ
            </h2>
          </div>

          <h2 className="font-heading text-4xl font-extrabold text-neutral-100 mb-12 text-center relative z-10 tracking-tight">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            {faqList.length > 0 ? (
              faqList.map((faq, idx) => {
                const isOpen = activeFaqIndex === idx;
                return (
                  <motion.div 
                    key={idx} 
                    className="bg-glass border border-glass rounded-2xl overflow-hidden transition-all duration-normal hover:border-primary/20"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex justify-between items-center p-6 cursor-pointer hover:bg-neutral-900/10 transition-colors text-left"
                    >
                      <span className="font-bold text-neutral-200 text-sm sm:text-base tracking-wide">{faq.question}</span>
                      <ChevronDown className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 text-neutral-400 text-xs sm:text-sm border-t border-neutral-850/40 pt-4 leading-relaxed font-sans font-light">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-16 text-center rounded-2xl border border-dashed border-neutral-850 bg-neutral-900/10 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="font-heading font-extrabold text-lg text-neutral-300">FAQs Loading Soon</h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-sm leading-relaxed font-light">
                  The FAQs are currently being updated by the organizers. Please check back later!
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Facebook Event Banner */}
      <FacebookEventBanner />

      {/* Footer */}
      <Footer />
    </div>
  );
}
