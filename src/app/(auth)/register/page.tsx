"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Mail, ArrowRight, UserCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg("Registration successful! You can now sign in.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during registration.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden select-text">
      {/* Top Navbar */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/60 backdrop-blur-xl border-b border-neutral-850 h-16">
        <div className="flex justify-between items-center px-6 md:px-16 max-w-[1280px] mx-auto h-full w-full">
          <Link href="/" className="font-heading text-lg font-black text-primary tracking-tight">
            CSE FEST 2026
          </Link>
          <div className="hidden md:flex items-center gap-8 text-neutral-400 font-sans text-sm">
            <Link href="/#about" className="hover:text-primary transition-colors">Events</Link>
            <Link href="/schedule" className="hover:text-primary transition-colors">Schedule</Link>
            <Link href="/#faq" className="hover:text-primary transition-colors">FAQ</Link>
          </div>
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2 px-5 h-auto rounded-lg">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="flex-grow flex flex-col md:flex-row pt-16 min-h-[calc(100vh-4rem)]">
        {/* Left Visual Panel (60%) */}
        <section className="hidden md:flex relative w-3/5 bg-neutral-950 overflow-hidden items-center justify-center border-r border-neutral-850">
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
          
          <div className="relative z-10 w-full px-12 flex flex-col items-center text-center">
            {/* Big Brand Logo */}
            <div className="mb-12 transform hover:scale-[1.01] transition-transform duration-500">
              <Image
                src="/logo of smuct and cse fest combined (for dark mode).png"
                alt="CSE Fest 2026 Logo"
                width={384}
                height={110}
                priority
                className="w-96 h-auto object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]"
              />
            </div>

            {/* Technical Stats Grid */}
            <div className="grid grid-cols-2 gap-6 w-full max-w-lg select-none">
              <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-850 p-6 rounded-xl text-left border-l-4 border-l-primary">
                <div className="font-mono text-primary text-2xl font-black mb-1">5000+</div>
                <div className="font-sans text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Participants</div>
              </div>
              <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-850 p-6 rounded-xl text-left border-l-4 border-l-tertiary">
                <div className="font-mono text-tertiary text-2xl font-black mb-1">20+</div>
                <div className="font-sans text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tracks</div>
              </div>
            </div>

            {/* Floating Code Elements */}
            <div className="absolute top-20 left-20 bg-neutral-900/50 border border-neutral-850 backdrop-blur-md p-3 rounded-lg rotate-12 opacity-50 select-none">
              <code className="font-mono text-xs text-primary">git commit -m &quot;innovation&quot;</code>
            </div>
            <div className="absolute bottom-20 right-20 bg-neutral-900/50 border border-neutral-850 backdrop-blur-md p-3 rounded-lg -rotate-6 opacity-50 select-none">
              <code className="font-mono text-xs text-tertiary">npm start fest-2026</code>
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
                className="flex-1 py-2 text-center rounded-md text-xs font-bold font-sans transition-all text-neutral-500 hover:text-neutral-300"
                onClick={() => router.push("/login")}
              >
                LOGIN
              </button>
              <button
                className="flex-1 py-2 text-center rounded-md text-xs font-bold font-sans transition-all bg-primary text-white"
                onClick={() => {}}
              >
                SIGN UP
              </button>
            </div>

            {/* Register View */}
            <div className="space-y-6">
              <div className="text-center md:text-left space-y-2">
                <h1 className="font-heading text-4xl font-extrabold text-neutral-50 leading-tight">Create Account</h1>
                <p className="text-neutral-400 font-sans text-sm">Join the command center of innovation.</p>
              </div>

              {/* Register Form */}
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

                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
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

                  <div className="relative">
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="••••••••"
                      error={errors.confirmPassword?.message}
                      disabled={loading}
                      className="pl-10 h-11 border-neutral-850 bg-neutral-950/40"
                      {...register("confirmPassword")}
                    />
                    <UserCheck className="absolute left-3.5 top-[38px] h-4.5 w-4.5 text-neutral-500 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full bg-primary hover:bg-primary/95 text-white py-3 h-auto rounded-lg text-sm font-bold font-sans flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </form>

              <div className="text-center text-xs font-sans text-neutral-500 select-none">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline ml-1">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


