"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg("Recovery email sent! Check your inbox for the password reset link.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-neutral-950">
      {/* Left Column: Branding / Stats */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-linear-to-br from-neutral-900 via-neutral-950 to-primary/10 border-r border-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <Link href="/" className="flex items-center z-10 group relative h-12 w-12">
          <Image
            src="/festlogo.png"
            alt="SMUCT CSE Fest '26 Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain transition-transform duration-150 group-hover:scale-[1.02] dark:hidden"
          />
          <Image
            src="/festlogo.png"
            alt="SMUCT CSE Fest '26 Dark Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain transition-transform duration-150 group-hover:scale-[1.02] hidden dark:block"
          />
        </Link>

        {/* Branding Slogan */}
        <div className="space-y-4 z-10">
          <h2 className="text-display-sm font-extrabold font-heading text-neutral-100 leading-tight">
            Recover Your Account.
          </h2>
          <p className="text-neutral-400 font-sans leading-relaxed">
            Locked out of your workspace? Submit your registered email address and we will send you a secure link to reset your credentials.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-xs text-neutral-500 font-sans z-10">
          Â© {new Date().getFullYear()} Dept of CSE & CSIT, SMUCT.
        </div>
      </div>

      {/* Right Column: Recovery Form */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-accent transition-colors mb-2 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Sign In</span>
            </Link>
            <h1 className="text-h3 font-heading font-bold text-neutral-50">Reset Password</h1>
            <p className="text-sm text-neutral-400 font-sans">
              Enter the email address associated with your account.
            </p>
          </div>

          <Card variant="default" className="p-0 border-0 bg-transparent shadow-none">
            <CardContent className="p-0 space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errorMsg && (
                  <div className="p-4 rounded-sm bg-error/10 border border-error/20 text-xs text-error font-sans font-medium leading-relaxed">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-4 rounded-sm bg-success/10 border border-success/20 text-xs text-success font-sans font-medium leading-relaxed">
                    {successMsg}
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@university.edu.bd"
                    error={errors.email?.message}
                    disabled={loading}
                    className="pl-10"
                    {...register("email")}
                  />
                  <Mail className="absolute left-3.5 top-10 h-4 w-4 text-neutral-600" />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={loading}
                    className="w-full justify-center gap-2"
                  >
                    <span>Send Reset Link</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

