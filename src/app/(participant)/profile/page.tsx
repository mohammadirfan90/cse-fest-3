"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR, { mutate } from "swr";
import {
  User,
  GraduationCap,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const profileSchema = z.object({
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().min(1, "Gender is required"),
  university: z.string().min(2, "University is required"),
  department: z.string().min(2, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
});

type ProfileFormData = z.input<typeof profileSchema>;

interface ProfileDbRecord {
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  university: string | null;
  department: string | null;
  semester: string | null;
  student_id: string | null;
  tshirt_size: string | null;
  profile_complete: boolean | null;
}

export default function ProfilePage() {
  const [mounted, setMounted] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = React.useState<"personal" | "academic">("personal");

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { data: profileRes, isLoading, error } = useSWR<{ success: boolean; data: ProfileDbRecord }>(
    mounted ? "/api/profile" : null,
    fetcher
  );

  const profile = React.useMemo(() => (profileRes?.success ? profileRes.data : null), [profileRes]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Sync form default values once profile data is loaded
  React.useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        gender: profile.gender || "",
        university: profile.university || "",
        department: profile.department || "",
        semester: profile.semester || "",
        student_id: profile.student_id || "",
        tshirt_size: profile.tshirt_size || "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setSaveLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update profile.");
      }

      setMessage({ type: "success", text: "Your profile has been updated successfully!" });
      mutate("/api/profile");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setSaveLoading(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-neutral-900/40 w-48 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-40 bg-neutral-900/40 rounded-xl border border-neutral-800 animate-pulse" />
          <div className="md:col-span-3 h-96 bg-neutral-900/40 rounded-xl border border-neutral-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="grow flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-error mb-4 animate-float" />
        <h3 className="font-heading font-extrabold text-lg text-neutral-300">Failed to load profile</h3>
        <p className="text-neutral-500 font-sans text-sm mt-1 max-w-sm">
          Please check your internet connection or reload the dashboard page to try again.
        </p>
      </div>
    );
  }

  const isComplete = profile.profile_complete || false;

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "academic", label: "Academic Info", icon: GraduationCap },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/40">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-heading text-neutral-100 tracking-tight">
            MY PROFILE SETTINGS
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-1">
            Manage your personal records, contact information, and registration credentials.
          </p>
        </div>

        {/* Profile Completeness Badge */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-neutral-800/60 bg-neutral-900/20 rounded">
            <span className={`h-1.5 w-1.5 rounded-full ${
              isComplete
                ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-error shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            }`} />
            <span className="text-sm uppercase font-mono tracking-widest text-neutral-400 font-medium">
              {isComplete ? "Profile Complete" : "Incomplete Profile"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Alert Message */}
      {message && (
        <div
          className={`flex gap-3 items-start p-4 rounded border animate-slide-down ${
            message.type === "success"
              ? "bg-success/20 border-success/30 text-success"
              : "bg-error/20 border-error/30 text-error"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-error mt-0.5" />
          )}
          <span className="text-xs font-mono tracking-wide">{message.text}</span>
        </div>
      )}

      {/* Form Area */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Tabs Navigation (1 column on md+) */}
          <div className="md:col-span-1 flex flex-row md:flex-col gap-1.5 bg-neutral-900/10 p-1 rounded border border-neutral-800/40 backdrop-blur-sm overflow-x-auto md:overflow-x-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 py-2 px-3 rounded text-xs font-mono tracking-wider capitalize transition-all duration-155 outline-none cursor-pointer text-left shrink-0 w-full ${
                    activeTab === tab.id
                      ? "bg-neutral-900 border border-neutral-800/60 text-neutral-100 font-semibold"
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/40 border border-transparent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel & Save Button (3 columns on md+) */}
          <div className="md:col-span-3 space-y-6">
            {/* Tab 1: Personal Details */}
            <div className={activeTab === "personal" ? "block" : "hidden"}>
              <Card className="border-neutral-800/40 bg-neutral-900/10 shadow-none rounded-lg p-5">
                <CardHeader className="border-b border-neutral-800/40 pb-3 mb-5">
                  <CardTitle className="text-xs uppercase font-mono tracking-widest text-neutral-400 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Personal Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Full Name</label>
                      <Input
                        placeholder="Your full name"
                        className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                        error={errors.full_name?.message}
                        {...register("full_name")}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="e.g. 017XXXXXXXX"
                        className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                        error={errors.phone?.message}
                        {...register("phone")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Gender</label>
                      <select
                        className={`flex h-9 w-full rounded border bg-neutral-950 px-3 py-2 text-xs text-neutral-200 outline-none transition-all duration-150 cursor-pointer font-sans ${
                          errors.gender
                            ? "border-rose-900/50 focus:border-rose-950 focus:ring-1 focus:ring-error/20"
                            : "border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60"
                        }`}
                        {...register("gender")}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.gender && (
                        <span className="text-xs text-error font-sans font-medium tracking-tight">
                          {errors.gender.message}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">T-Shirt Size</label>
                      <select
                        className={`flex h-9 w-full rounded border bg-neutral-950 px-3 py-2 text-xs text-neutral-200 outline-none transition-all duration-155 cursor-pointer font-sans ${
                          errors.tshirt_size
                            ? "border-rose-900/50 focus:border-rose-950 focus:ring-1 focus:ring-error/20"
                            : "border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60"
                        }`}
                        {...register("tshirt_size")}
                      >
                        <option value="">Select Size</option>
                        <option value="S">Small (S)</option>
                        <option value="M">Medium (M)</option>
                        <option value="L">Large (L)</option>
                        <option value="XL">Extra Large (XL)</option>
                        <option value="XXL">Double Extra Large (XXL)</option>
                      </select>
                      {errors.tshirt_size && (
                        <span className="text-xs text-error font-sans font-medium tracking-tight">
                          {errors.tshirt_size.message}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tab 2: Academic Info */}
            <div className={activeTab === "academic" ? "block" : "hidden"}>
              <Card className="border-neutral-800/40 bg-neutral-900/10 shadow-none rounded-lg p-5">
                <CardHeader className="border-b border-neutral-800/40 pb-3 mb-5">
                  <CardTitle className="text-xs uppercase font-mono tracking-widest text-neutral-400 flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Academic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">University / Institution</label>
                    <Input
                      placeholder="e.g. Shanto-Mariam University of Creative Technology"
                      className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                      error={errors.university?.message}
                      {...register("university")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Department</label>
                      <Input
                        placeholder="e.g. CSE"
                        className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                        error={errors.department?.message}
                        {...register("department")}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Semester</label>
                      <Input
                        placeholder="e.g. 8th"
                        className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                        error={errors.semester?.message}
                        {...register("semester")}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Student ID</label>
                    <Input
                      placeholder="Your ID card registration code"
                      className="bg-neutral-950 border-neutral-800/80 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 hover:border-neutral-700/60 transition-all duration-150 text-xs h-9"
                      error={errors.student_id?.message}
                      {...register("student_id")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Buttons */}
            <div className="pt-2">
              <Button
                type="submit"
                isLoading={saveLoading}
                className="w-full py-2.5 rounded border border-neutral-800/85 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-900/80 text-neutral-250 hover:text-neutral-100 font-mono text-xs uppercase tracking-wider transition-all duration-155 flex items-center justify-center gap-2 active:scale-99"
              >
                {!saveLoading && <Save className="h-3.5 w-3.5" />}
                <span>Save Profile Details</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
