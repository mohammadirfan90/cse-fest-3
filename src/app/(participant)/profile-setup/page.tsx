"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Terminal, Upload, AlertCircle, ArrowLeft, ArrowRight, Check, X, Fingerprint, GraduationCap, Lock, Info, HelpCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createClient } from "@/lib/supabase/client";

const wizardSchema = z.object({
  // Step 1: Identity
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().optional().nullable(),
  // Step 2: Academic & Festival
  university: z.string().min(2, "University name is required"),
  department: z.string().min(2, "Department name is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
});

type WizardFormData = z.input<typeof wizardSchema>;

export default function ProfileSetupWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string>("");



  // Retrieve user email from Supabase session and guard re-entry
  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);

        // If profile is already complete, redirect to dashboard
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_complete")
          .eq("id", user.id)
          .single();

        if (profile?.profile_complete) {
          router.replace("/dashboard");
        }
      }
    };
    fetchUser();
  }, [router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    mode: "all",
  });



  const nextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["full_name", "phone"]);
    } else if (step === 2) {
      isValid = await trigger(["university", "department", "semester", "student_id", "tshirt_size"]);
    }

    if (isValid) {
      setErrorMsg(null);
      setStep((prev) => Math.min(prev + 1, 2));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: WizardFormData) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Save Profile Text Data
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const profileData = await profileRes.json();
      if (!profileData.success) {
        throw new Error(profileData.message || "Failed to update profile information.");
      }



      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during profile setup.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const stepsConfig = [
    { id: 1, label: "Identity", icon: Fingerprint },
    { id: 2, label: "Academic", icon: GraduationCap },
  ];

  return (
    <div className="w-full space-y-6 py-2 max-w-5xl animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-neutral-800/40 pb-4">
        <div>
          <h1 className="text-lg md:text-xl font-heading font-bold text-neutral-100 flex items-center gap-2.5 tracking-tight uppercase">
            <Terminal className="h-5 w-5 text-neutral-400" />
            <span>Delegate Onboarding Wizard</span>
          </h1>
          <p className="text-xs text-neutral-500 font-sans mt-1">
            Complete your official festival registration wizard to unlock competition entries and team setups.
          </p>
        </div>
        <div className="shrink-0">
          <span className="font-mono text-sm uppercase tracking-widest text-neutral-400 bg-neutral-900/50 border border-neutral-800/60 px-3 py-1.5 rounded">
            STEP {step} OF 2
          </span>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="bg-neutral-900/10 border border-neutral-800/40 rounded p-4 shadow-none">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {stepsConfig.map((item, idx) => {
            const isCompleted = step > item.id;
            const isActive = step === item.id;
            return (
              <React.Fragment key={item.id}>
                {/* Step Item */}
                <button
                  type="button"
                  onClick={() => {
                    if (item.id < step) {
                      setStep(item.id);
                    }
                  }}
                  disabled={item.id >= step}
                  className="flex items-center gap-2 outline-none focus:outline-none text-left disabled:cursor-not-allowed group"
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center border text-sm font-mono transition-all duration-150 shrink-0 ${
                      isActive
                        ? "border-neutral-400 bg-neutral-900 text-neutral-100 font-bold"
                        : isCompleted
                        ? "border-neutral-800 bg-neutral-900/45 text-neutral-300 group-hover:border-neutral-700 cursor-pointer"
                        : "border-neutral-900 bg-neutral-950 text-neutral-600"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : item.id}
                  </div>
                  <div className="hidden md:block">
                    <p
                      className={`text-sm font-mono tracking-widest uppercase transition-colors ${
                        isActive
                          ? "text-neutral-200 font-semibold"
                          : isCompleted
                          ? "text-neutral-400 group-hover:text-neutral-200 cursor-pointer"
                          : "text-neutral-600"
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                </button>
                {/* Connector Line */}
                {idx < stepsConfig.length - 1 && (
                  <div
                    className={`grow h-px mx-3 transition-colors duration-150 ${
                      step > item.id ? "bg-neutral-800/80" : "bg-neutral-900/85"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Area */}
        <div className="lg:col-span-8 bg-neutral-900/10 border border-neutral-800/40 rounded-lg p-6 flex flex-col min-h-[440px] justify-between">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 grow flex flex-col justify-between">
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded bg-error/20 border border-error/30 text-xs text-error font-mono flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="border-b border-neutral-800/30 pb-3 mb-4">
                      <h2 className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-semibold">Identity Details</h2>
                      <p className="text-xs text-neutral-500 font-sans mt-1">Let&apos;s start with your basic identification for your official festival pass.</p>
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Full Name</label>
                      <Input
                        placeholder="e.g. Abdullah Al Mamun"
                        error={errors.full_name?.message}
                        className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                        {...register("full_name")}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full relative">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">University Email Address</label>
                      <div className="relative">
                        <Input
                          value={userEmail}
                          readOnly
                          disabled
                          className="pl-9 h-9 border-neutral-800/30 bg-neutral-900/50 text-neutral-500 select-all cursor-not-allowed text-xs"
                        />
                        <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-600 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Phone Number</label>
                      <Input
                        placeholder="+880 1XXX-XXXXXX"
                        error={errors.phone?.message}
                        className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                        {...register("phone")}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="border-b border-neutral-800/30 pb-3 mb-4">
                      <h2 className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-semibold">Academic Records</h2>
                      <p className="text-xs text-neutral-500 font-sans mt-1">Provide your current university status to check registration eligibility.</p>
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Institution</label>
                      <Input
                        placeholder="e.g. Shanto-Mariam University of Creative Technology"
                        error={errors.university?.message}
                        className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                        {...register("university")}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Department</label>
                      <Input
                        placeholder="e.g. Computer Science & Engineering"
                        error={errors.department?.message}
                        className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                        {...register("department")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5 w-full">
                        <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Semester</label>
                        <Input
                          placeholder="e.g. 8th"
                          error={errors.semester?.message}
                          className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                          {...register("semester")}
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5 w-full">
                        <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none">Student ID</label>
                        <Input
                          placeholder="e.g. 201071000"
                          error={errors.student_id?.message}
                          className="h-9 border-neutral-800/80 bg-neutral-950 text-xs focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 transition-all duration-150"
                          {...register("student_id")}
                        />
                      </div>
                    </div>

                    {/* T-Shirt Size — button toggle */}
                    <div className="flex flex-col space-y-1.5 pt-2">
                      <label className="text-sm font-semibold text-neutral-400 font-mono uppercase tracking-widest select-none font-mono">Festival T-Shirt Size</label>
                      <div className="grid grid-cols-5 gap-2">
                        {(["S", "M", "L", "XL", "XXL"] as const).map((size) => {
                          const isSelected = watch("tshirt_size") === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setValue("tshirt_size", size, { shouldValidate: true })}
                              className={`h-9 rounded border text-xs font-mono transition-all duration-150 tracking-wider ${
                                isSelected
                                  ? "border-neutral-400 bg-neutral-900 text-neutral-100 font-bold"
                                  : "border-neutral-900 bg-neutral-950/40 text-neutral-500 hover:border-neutral-850 hover:text-neutral-350"
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                      <input type="hidden" {...register("tshirt_size")} />
                      {errors.tshirt_size && (
                        <span className="text-xs text-error font-sans font-medium">{errors.tshirt_size.message}</span>
                      )}
                    </div>
                  </motion.div>
                )}


              </AnimatePresence>
            </div>

            <div className="flex justify-between items-center pt-5 border-t border-neutral-800/40 mt-8">
              <Button
                variant="secondary"
                type="button"
                onClick={prevStep}
                disabled={step === 1 || loading}
                className="gap-2 px-4 h-9 text-xs font-mono uppercase tracking-wider cursor-pointer border border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-300 active:scale-98"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>

              {step < 2 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent gap-2 px-5 h-9 text-xs font-mono uppercase tracking-wider cursor-pointer active:scale-98"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  isLoading={loading}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent gap-2 px-6 h-9 text-xs font-mono uppercase tracking-wider cursor-pointer active:scale-98"
                >
                  <span>Submit Profile</span>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Sidebar Column */}
        <aside className="lg:col-span-4 flex flex-col justify-between h-full space-y-6">
          <div className="bg-neutral-900/10 border border-neutral-800/40 rounded-lg p-5 space-y-5 grow">
            <div className="w-10 h-10 bg-neutral-900 border border-neutral-800/60 rounded flex items-center justify-center mb-2">
              <Info className="h-4.5 w-4.5 text-neutral-400" />
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="info-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 font-sans"
                >
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-200">Why Identity?</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Your name and gender details are mapped directly onto the printed Delegate Badges and certificates. Please double-check spelling.
                  </p>
                  <div className="bg-neutral-900/40 border border-neutral-800/40 rounded p-3 mt-4">
                    <div className="flex gap-2">
                      <Shield className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-widest">Encrypted Storage</h4>
                        <p className="text-sm text-neutral-500 leading-tight">All personal records are encrypted and kept strictly confidential.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="info-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 font-sans"
                >
                  <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-200">Academic Check</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    CSE Fest 2026 hosts contests targeting specific student demographics (e.g. internal university vs national level external hackathons).
                  </p>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Providing your accurate department and registration ID allows instant verification rules to be met.
                  </p>
                </motion.div>
              )}


            </AnimatePresence>
          </div>

          <div className="space-y-3 pt-4 border-t border-neutral-800/40 font-sans">
            <div className="p-3 bg-neutral-900/10 border border-neutral-800/40 rounded">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-mono font-bold text-neutral-400 uppercase tracking-widest">Need Assistance?</h4>
                  <p className="text-sm text-neutral-500 font-sans leading-tight mt-0.5">Contact the registration helpline at register@csefest2026.com</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
