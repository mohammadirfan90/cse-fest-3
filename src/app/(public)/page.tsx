"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import useSWR from "swr";
import { Navbar } from "@/components/shared/Navbar";
import { NewsTicker } from "@/components/public/NewsTicker";
import { HeroSection } from "@/components/public/HeroSection";
import { FeaturedCompetitions } from "@/components/public/FeaturedCompetitions";
import { Timeline } from "@/components/public/Timeline";
import { Footer } from "@/components/shared/Footer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

      {/* Footer */}
      <Footer />
    </div>
  );
}
