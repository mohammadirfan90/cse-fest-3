"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, LogIn, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Competitions", href: "/#competitions" },
  { label: "Timeline", href: "/#timeline" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

// Section IDs to track for active highlight
const SECTION_IDS = ["about", "competitions", "timeline", "faq", "contact"];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  // Default to "dark" — the public site is dark-first by design.
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  const [scrolled, setScrolled] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("");

  // Theme keys are scoped per route group so a user's choice on the
  // public site never bleeds into the dashboard / admin surfaces (and
  // vice versa). Public routes use `theme_public`; everything else
  // uses the canonical `theme` key. The pre-paint script in
  // src/app/(public)/layout.tsx reads from `theme_public` first, so
  // toggling here is in lockstep with what the browser painted.
  const isPublicRoute = pathname?.startsWith("/competitions") ||
    pathname === "/" ||
    pathname === "/schedule" ||
    pathname === "/finalists" ||
    pathname?.startsWith("/competitions/");
  const themeStorageKey = isPublicRoute ? "theme_public" : "theme";

  // Scroll listener for glassmorphism intensify
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync theme from DOM on mount (respects existing localStorage preference)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const key = isPublicRoute ? "theme_public" : "theme";
    const saved = localStorage.getItem(key);
    // Default rules per surface:
    //   - public: dark (brand)
    //   - dashboard/admin: light (matches design tokens)
    const prefersDark = isPublicRoute
      ? saved !== "light" // dark unless user explicitly chose light
      : saved
        ? saved === "dark"
        : !document.documentElement.classList.contains("light");
    // Apply class and sync state via requestAnimationFrame to avoid
    // synchronous setState in effect body (react-hooks/set-state-in-effect)
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    const raf = requestAnimationFrame(() => {
      setTheme(prefersDark ? "dark" : "light");
    });
    return () => cancelAnimationFrame(raf);
  }, [isPublicRoute]);

  // IntersectionObserver for active section highlight
  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3, rootMargin: "-80px 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const supabase = createClient();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { subscription.unsubscribe(); };
  }, [supabase]);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem(themeStorageKey, "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem(themeStorageKey, "light");
      setTheme("light");
    }
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-glass border-b border-primary/20 shadow-[0_1px_32px_rgba(99,102,241,0.12)] backdrop-blur-xl"
          : "bg-glass border-b border-glass backdrop-blur-md"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center group relative h-12 w-12">
            <Image
              src="/festlogo.png"
              alt="SMUCT CSE Fest '26 Logo"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain transition-transform duration-150 group-hover:scale-[1.02] dark:hidden"
            />
            <Image
              src="/festlogo.png"
              alt="SMUCT CSE Fest '26 Dark Logo"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain transition-transform duration-150 group-hover:scale-[1.02] hidden dark:block"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => {
              const isHash = link.href.startsWith("/#");
              const sectionId = isHash ? link.href.split("#")[1] : "";
              const isActive = isHash
                ? pathname === "/" && activeSection === sectionId
                : pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative text-sm font-sans font-medium py-1 transition-colors duration-150 group ${
                    isActive ? "text-neutral-50" : "text-neutral-400 hover:text-neutral-50"
                  }`}
                >
                  {link.label}
                  {/* Animated underline — slides in on hover, stays on active */}
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 bg-accent transition-all duration-normal rounded-full ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* CTA Buttons & Theme Toggler */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="p-2 rounded-full border border-neutral-800/80 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-50 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5" />
              )}
            </Button>

            {user ? (
              <Link href="/dashboard">
                <Button variant="secondary" className="gap-2">
                  <LayoutDashboard className="h-4 w-4 text-accent" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="primary" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile: Theme Toggler + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="p-2 rounded-full border border-neutral-800/80 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-50 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5" />
              )}
            </Button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-50 focus:outline-none cursor-pointer transition-colors"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — animated slide-down */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-b border-glass bg-glass backdrop-blur-xl px-4 pt-3 pb-5 space-y-1"
          >
            {NAV_LINKS.map((link, i) => {
              const isHash = link.href.startsWith("/#");
              const sectionId = isHash ? link.href.split("#")[1] : "";
              const isActive = isHash
                ? pathname === "/" && activeSection === sectionId
                : pathname === link.href;
              return (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2 text-sm font-medium py-2.5 px-3 rounded-lg font-sans transition-colors ${
                      isActive
                        ? "text-neutral-50 bg-primary/8"
                        : "text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800/30"
                    }`}
                  >
                    {isActive && (
                      <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                    )}
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}
            <div className="pt-3 mt-2 border-t border-neutral-800/60">
              {user ? (
                <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                  <Button variant="secondary" className="w-full gap-2">
                    <LayoutDashboard className="h-4 w-4 text-accent" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

