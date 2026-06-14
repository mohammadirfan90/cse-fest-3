"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Mail, ArrowRight, ShieldAlert, Sun, Moon, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const NAV_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Competitions", href: "/#competitions" },
  { label: "Timeline", href: "/#timeline" },
  { label: "Schedule", href: "/schedule" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  const [scrolled, setScrolled] = React.useState(false);

  // Scroll listener for top bar
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Theme synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    const prefersDark = saved
      ? saved === "dark"
      : !document.documentElement.classList.contains("light");
    
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
    }
    const raf = requestAnimationFrame(() => {
      setTheme(prefersDark ? "dark" : "light");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during login.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden select-text">
      {/* Top Navbar */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-glass border-b border-primary/20 shadow-[0_1px_32px_rgba(99,102,241,0.12)] backdrop-blur-xl"
            : "bg-glass border-b border-glass backdrop-blur-md"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center group relative h-10 w-[140px]">
              <Image
                src="/logo of smuct and cse fest combined light.png"
                alt="SMUCT CSE Fest '26 Logo"
                width={140}
                height={40}
                priority
                className="h-10 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02] dark:hidden"
              />
              <Image
                src="/logo of smuct and cse fest combined (for dark mode).png"
                alt="SMUCT CSE Fest '26 Dark Logo"
                width={140}
                height={40}
                priority
                className="h-10 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02] hidden dark:block"
              />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`relative text-sm font-sans font-medium py-1 transition-colors duration-150 group ${
                      isActive ? "text-neutral-50" : "text-neutral-400 hover:text-neutral-50"
                    }`}
                  >
                    {link.label}
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
            </div>

            {/* Mobile Menu Button */}
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

        {/* Mobile Menu */}
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
                const isActive = pathname === link.href;
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
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Split Screen */}
      <main className="flex-grow flex flex-col md:flex-row pt-16 min-h-[calc(100vh-4rem)]">
        {/* Left Visual Panel (60%) */}
        <section className="hidden md:flex relative w-3/5 bg-neutral-950 overflow-hidden items-center justify-center border-r border-neutral-850">
          {/* Animated Background Mesh Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-primary/20 blur-[140px] rounded-full animate-pulse pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-secondary/15 blur-[120px] rounded-full animate-[pulse_4s_ease-in-out_infinite] pointer-events-none" />
          <div className="absolute top-[30%] right-[10%] w-[25vw] h-[25vw] bg-accent/10 blur-[90px] rounded-full animate-[pulse_6s_ease-in-out_infinite] pointer-events-none" />
          
          {/* Tech Grid Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40 mix-blend-color-dodge pointer-events-none" />
          
          {/* Scan Line Animation */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1/3 w-full opacity-0 pointer-events-none animate-scan-line" />
          
          {/* Fine Noise Overlay */}
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          
          <div className="relative z-10 w-full px-12 flex flex-col items-center text-center">
            {/* Big Brand Logo */}
            <div className="transform hover:scale-[1.01] transition-transform duration-500">
              <Image
                src="/logo of smuct and cse fest combined (for dark mode).png"
                alt="CSE Fest 2026 Logo"
                width={384}
                height={110}
                priority
                className="w-96 h-auto object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]"
              />
            </div>
          </div>
        </section>

        {/* Right Auth Card (40%) */}
        <section className="w-full md:w-2/5 flex items-center justify-center p-6 md:p-12 relative bg-neutral-900/10">
          <div className="absolute inset-0 bg-grid-pattern md:hidden opacity-20" />
          <div className="w-full max-w-md z-10 space-y-8">
            {/* Auth Tab Toggle */}
            <div className="flex bg-neutral-900 border border-neutral-850 rounded-lg p-1">
              <button
                className="flex-1 py-2 text-center rounded-md text-xs font-bold font-sans transition-all bg-primary text-white"
                onClick={() => {}}
              >
                LOGIN
              </button>
              <button
                className="flex-1 py-2 text-center rounded-md text-xs font-bold font-sans transition-all text-neutral-500 hover:text-neutral-300"
                onClick={() => router.push("/register")}
              >
                SIGN UP
              </button>
            </div>

            {/* Login View */}
            <div className="space-y-6">
              <div className="text-center md:text-left space-y-2">
                <h1 className="font-heading text-4xl font-extrabold text-neutral-50 leading-tight">Welcome Back</h1>
                <p className="text-neutral-400 font-sans text-sm">Access the command center of innovation.</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <AnimatePresence mode="wait">
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2"
                    >
                      <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="dev@csefest.com"
                      error={errors.email?.message}
                      disabled={loading}
                      className="pl-10 h-11 border-neutral-850 bg-neutral-950/40"
                      {...register("email")}
                    />
                    <Mail className="absolute left-3.5 top-[38px] h-4.5 w-4.5 text-neutral-500 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <Input
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      error={errors.password?.message}
                      disabled={loading}
                      className="pl-10 h-11 border-neutral-850 bg-neutral-950/40"
                      {...register("password")}
                    />
                    <Lock className="absolute left-3.5 top-[38px] h-4.5 w-4.5 text-neutral-500 pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-end text-xs font-sans">
                  <Link href="/forgot-password" className="text-primary hover:underline font-bold">
                    Forgot Password?
                  </Link>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full bg-primary hover:bg-primary/95 text-white py-3 h-auto rounded-lg text-sm font-bold font-sans flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </form>

              <div className="text-center text-xs font-sans text-neutral-500 select-none">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline ml-1">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

