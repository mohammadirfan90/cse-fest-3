"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg("Password updated successfully! Redirecting you to the dashboard...");
      
      // Auto-redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-neutral-950">
      {/* Left Column: Branding / Info */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-linear-to-br from-neutral-900 via-neutral-950 to-primary/10 border-r border-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <Link href="/" className="flex items-center z-10 group relative h-12 w-12">
          <Image
            src="/festlogo.png"
            alt="SMUCT CSE Fest '26 Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain transition-transform duration-150 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Branding Slogan */}
        <div className="space-y-4 z-10">
          <h2 className="text-display-sm font-extrabold font-heading text-neutral-100 leading-tight">
            Secure Your Account.
          </h2>
          <p className="text-neutral-400 font-sans leading-relaxed">
            Specify a new, strong credentials password below to re-establish secure access to your participant space.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-xs text-neutral-500 font-sans z-10">
          © {new Date().getFullYear()} Dept of CSE & CSIT, SMUCT.
        </div>
      </div>

      {/* Right Column: Update Password Form */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-h3 font-heading font-bold text-neutral-50">Set New Password</h1>
            <p className="text-sm text-neutral-400 font-sans">
              Enter your new credentials below.
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
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    disabled={loading}
                    className="pl-10"
                    {...register("password")}
                  />
                  <Lock className="absolute left-3.5 top-10 h-4 w-4 text-neutral-600" />
                </div>

                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                    disabled={loading}
                    className="pl-10"
                    {...register("confirmPassword")}
                  />
                  <Lock className="absolute left-3.5 top-10 h-4 w-4 text-neutral-600" />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={loading}
                    className="w-full justify-center gap-2"
                  >
                    <span>Update Password</span>
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
