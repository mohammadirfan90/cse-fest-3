"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Trophy,
  Users,
  Shield,
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Send,
  Loader2,
  AlertTriangle,
  LogOut,
  CheckCircle2
} from "lucide-react";

import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { FileDropzone } from "@/components/submissions/FileDropzone";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Competition {
  id: string;
  name: string;
  type: string;
  shortDescription: string;
  fee: string;
  eligibility: string;
  minMembers: number;
  maxMembers: number;
  submissionRequired: boolean;
  rulebookUrl?: string;
  templateLink?: string;
  bannerImageUrl?: string;
  coverImageUrl?: string;
}

const COMPETITION_IMAGES: Record<string, string> = {
  "e0bb66f8-45e0-4c12-a1f7-418f773b069d": "/software-showcase-logo.png",
  "318a4a58-89c0-449e-ba60-318df883ba58": "/iot-showcase-logo.png",
  "dfec0659-6308-42e3-aaf6-dfdc85eb2cfa": "/idea-showcase-logo.png",
  "software-showcase": "/software-showcase-logo.png",
  "iot-showcase": "/iot-showcase-logo.png",
  "idea-showcase": "/idea-showcase-logo.png",
};

interface MemberState {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  university: string;
  department: string;
  semester: string;
  student_id: string;
  tshirt_size: string;
}

export default function CompetitionRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const compId = params?.id as string;
  const supabase = createClient();

  // 1. Fetch competition info
  const { data: compRes, error: compErr, isLoading: compLoading } = useSWR<{
    success: boolean;
    data: Competition;
  }>(compId ? `/api/public/competitions?id=${compId}` : null, fetcher);

  const competition = compRes?.success ? compRes.data : null;

  // 2. Auth states
  const [user, setUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [checkingRegistration, setCheckingRegistration] = React.useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = React.useState(false);

  // 3. Form Data States
  const [teamName, setTeamName] = React.useState("");

  // Leader Form State (pre-filled later)
  const [leaderForm, setLeaderForm] = React.useState<MemberState>({
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    university: "",
    department: "",
    semester: "",
    student_id: "",
    tshirt_size: "",
  });

  // Teammates List state
  const [members, setMembers] = React.useState<MemberState[]>([]);

  // Submission States
  const [projectTitle, setProjectTitle] = React.useState("");
  const [projectNotes, setProjectNotes] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);

  // 4. Progress and error notifications
  const [formLoading, setFormLoading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [formStatus, setFormStatus] = React.useState<
    "idle" | "updating_profile" | "creating_team" | "adding_members" | "submitting_proposal" | "success"
  >("idle");
  const [currentMemberIndex, setCurrentMemberIndex] = React.useState<number>(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Robust Retrying States (Avoid duplicates if a step fails midway)
  const [createdTeamId, setCreatedTeamId] = React.useState<string | null>(null);
  const [addedMemberEmails, setAddedMemberEmails] = React.useState<string[]>([]);

  // Validation States
  const [touchedFields, setTouchedFields] = React.useState<Record<string, boolean>>({});
  const [submittedOnce, setSubmittedOnce] = React.useState(false);
  const [submitButtonStatus, setSubmitButtonStatus] = React.useState<"idle" | "loading" | "success" | "failure">("idle");

  const getErrors = React.useCallback(() => {
    const errors: Record<string, string> = {};

    // 1. Team Name
    if (!teamName || !teamName.trim()) {
      errors['teamName'] = "Team Name is required.";
    } else if (teamName.trim().length < 3) {
      errors['teamName'] = "Team Name must be at least 3 characters long.";
    }

    // 2. Leader Details
    const l = leaderForm;
    if (!l.full_name || !l.full_name.trim()) errors['leader_full_name'] = "Full Name is required.";
    if (!l.phone || !l.phone.trim()) {
      errors['leader_phone'] = "Phone Number is required.";
    } else if (l.phone.trim().length < 10) {
      errors['leader_phone'] = "Phone number must be at least 10 digits.";
    }
    if (!l.gender) errors['leader_gender'] = "Gender is required.";
    if (!l.university || !l.university.trim()) errors['leader_university'] = "University is required.";
    if (!l.department || !l.department.trim()) errors['leader_department'] = "Department is required.";
    if (!l.semester || !l.semester.trim()) errors['leader_semester'] = "Semester is required.";
    if (!l.student_id || !l.student_id.trim()) errors['leader_student_id'] = "Student ID is required.";
    if (!l.tshirt_size) errors['leader_tshirt_size'] = "T-shirt Size is required.";

    // 3. Teammates Details
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    members.forEach((m, idx) => {
      const prefix = `member_${idx}`;
      const mNum = idx + 2;

      if (!m.full_name || !m.full_name.trim()) {
        errors[`${prefix}_full_name`] = `Member ${mNum} Full Name is required.`;
      }

      if (!m.email || !m.email.trim()) {
        errors[`${prefix}_email`] = `Member ${mNum} Email is required.`;
      } else if (!emailRegex.test(m.email.trim())) {
        errors[`${prefix}_email`] = "Please enter a valid email address.";
      } else if (m.email.trim().toLowerCase() === l.email.trim().toLowerCase()) {
        errors[`${prefix}_email`] = `Member ${mNum} has the same email as the Team Leader.`;
      } else {
        for (let j = 0; j < idx; j++) {
          if (m.email.trim().toLowerCase() === members[j].email.trim().toLowerCase()) {
            errors[`${prefix}_email`] = `Member ${mNum} and Member ${j + 2} cannot have the same email address.`;
            break;
          }
        }
      }

      if (!m.phone || !m.phone.trim()) {
        errors[`${prefix}_phone`] = `Member ${mNum} Phone is required.`;
      } else if (m.phone.trim().length < 10) {
        errors[`${prefix}_phone`] = `Member ${mNum} phone number must be at least 10 digits.`;
      }

      if (!m.gender) errors[`${prefix}_gender`] = `Member ${mNum} Gender is required.`;
      if (!m.university || !m.university.trim()) errors[`${prefix}_university`] = `Member ${mNum} University is required.`;
      if (!m.department || !m.department.trim()) errors[`${prefix}_department`] = `Member ${mNum} Department is required.`;
      if (!m.semester || !m.semester.trim()) errors[`${prefix}_semester`] = `Member ${mNum} Semester is required.`;
      if (!m.student_id || !m.student_id.trim()) errors[`${prefix}_student_id`] = `Member ${mNum} Student ID is required.`;
      if (!m.tshirt_size) errors[`${prefix}_tshirt_size`] = `Member ${mNum} T-shirt Size is required.`;
    });

    // 4. Project Details
    if (competition?.submissionRequired) {
      if (!projectTitle || !projectTitle.trim()) {
        errors['projectTitle'] = "Project Title is required.";
      } else if (projectTitle.trim().length < 5) {
        errors['projectTitle'] = "Project Title must be at least 5 characters long.";
      }
    }

    return errors;
  }, [teamName, leaderForm, members, competition, projectTitle]);

  const handleBlur = (fieldKey: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldKey]: true }));
  };

  const allErrors = getErrors();

  const isInvalid = (fieldKey: string) => {
    return !!allErrors[fieldKey] && (touchedFields[fieldKey] || submittedOnce);
  };

  const getFieldError = (fieldKey: string) => {
    return isInvalid(fieldKey) ? allErrors[fieldKey] : undefined;
  };

  const isValidField = (fieldKey: string, value: string) => {
    return !!value && !allErrors[fieldKey] && (touchedFields[fieldKey] || submittedOnce);
  };

  // Section completeness states
  const isTeamDetailsComplete = !allErrors['teamName'];
  const isLeaderComplete = !Object.keys(allErrors).some(k => k.startsWith('leader_'));
  const isTeammatesComplete = !Object.keys(allErrors).some(k => k.startsWith('member_'));
  const isProjectComplete = !Object.keys(allErrors).some(k => k.startsWith('project'));

  // Initialize teammate cards based on minMembers requirement
  React.useEffect(() => {
    if (competition) {
      const neededTeammatesCount = Math.max(0, competition.minMembers - 1);
      const initialMembers: MemberState[] = Array.from({ length: neededTeammatesCount }, () => ({
        full_name: "",
        email: "",
        phone: "",
        gender: "",
        university: "",
        department: "",
        semester: "",
        student_id: "",
        tshirt_size: "",
      }));
      setMembers(initialMembers);
    }
  }, [competition]);

  // Load User, Profile, and check Existing Registrations in parallel to resolve waterfalls
  React.useEffect(() => {
    async function initAuth() {
      try {
        setAuthLoading(true);
        setProfileLoading(true);
        setCheckingRegistration(true);

        const [userRes, profileRes, teamRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch("/api/profile").then((r) => r.json()).catch(() => ({ success: false })),
          fetch("/api/teams").then((r) => r.json()).catch(() => ({ success: false })),
        ]);

        const loggedInUser = userRes.data?.user || null;
        setUser(loggedInUser);

        if (loggedInUser) {
          setLeaderForm((prev) => ({
            ...prev,
            email: loggedInUser.email || "",
            full_name: loggedInUser.user_metadata?.full_name || loggedInUser.user_metadata?.name || "",
          }));

          if (profileRes.success && profileRes.data) {
            const profile = profileRes.data;
            setLeaderForm({
              full_name: profile.full_name || "",
              email: loggedInUser.email || "",
              phone: profile.phone || "",
              gender: profile.gender || "",
              university: profile.university || "",
              department: profile.department || "",
              semester: profile.semester || "",
              student_id: profile.student_id || "",
              tshirt_size: profile.tshirt_size || "",
            });
          }

          if (teamRes.success && Array.isArray(teamRes.data)) {
            const hasRegistered = teamRes.data.some(
              (t: any) => t.competition_id === compId
            );
            setAlreadyRegistered(hasRegistered);
          }
        }
      } catch (err) {
        console.error("Error loading user state:", err);
      } finally {
        setAuthLoading(false);
        setProfileLoading(false);
        setCheckingRegistration(false);
      }
    }

    if (compId) {
      initAuth();
    }
  }, [supabase, compId]);

  // Trigger Google Login
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/competitions/${compId}/register`,
      },
    });
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAlreadyRegistered(false);
    router.refresh();
  };

  // Handle adding dynamic member
  const handleAddMember = () => {
    if (competition && members.length + 1 >= competition.maxMembers) return;
    setMembers((prev) => [
      ...prev,
      {
        full_name: "",
        email: "",
        phone: "",
        gender: "",
        university: "",
        department: "",
        semester: "",
        student_id: "",
        tshirt_size: "",
      },
    ]);
  };

  // Handle removing member card
  const handleRemoveMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // Update member field
  const handleMemberChange = (index: number, field: keyof MemberState, value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  // Update leader field
  const handleLeaderChange = (field: keyof MemberState, value: string) => {
    setLeaderForm((prev) => ({ ...prev, [field]: value }));
  };

  // Submit Handler: Sequential API calls
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedOnce(true);

    const errors = getErrors();
    const errorKeys = Object.keys(errors);

    if (errorKeys.length > 0) {
      setErrorMsg("Please complete all required fields before submitting.");
      setSubmitButtonStatus("failure");

      // Touch all fields to show validation errors immediately
      const touchedAll: Record<string, boolean> = {};
      touchedAll['teamName'] = true;
      touchedAll['leader_full_name'] = true;
      touchedAll['leader_phone'] = true;
      touchedAll['leader_gender'] = true;
      touchedAll['leader_university'] = true;
      touchedAll['leader_department'] = true;
      touchedAll['leader_semester'] = true;
      touchedAll['leader_student_id'] = true;
      touchedAll['leader_tshirt_size'] = true;

      members.forEach((_, idx) => {
        touchedAll[`member_${idx}_full_name`] = true;
        touchedAll[`member_${idx}_email`] = true;
        touchedAll[`member_${idx}_phone`] = true;
        touchedAll[`member_${idx}_gender`] = true;
        touchedAll[`member_${idx}_university`] = true;
        touchedAll[`member_${idx}_department`] = true;
        touchedAll[`member_${idx}_semester`] = true;
        touchedAll[`member_${idx}_student_id`] = true;
        touchedAll[`member_${idx}_tshirt_size`] = true;
      });

      if (competition?.submissionRequired) {
        touchedAll['projectTitle'] = true;
      }

      setTouchedFields(touchedAll);

      // Scroll smoothly to first invalid field and apply focus / highlight pulse
      setTimeout(() => {
        const firstInvalidEl = document.querySelector('[aria-invalid="true"]');
        if (firstInvalidEl) {
          firstInvalidEl.scrollIntoView({ behavior: "smooth", block: "center" });
          (firstInvalidEl as HTMLElement).focus();
          firstInvalidEl.classList.add("animate-error-pulse");
          setTimeout(() => {
            firstInvalidEl.classList.remove("animate-error-pulse");
          }, 1000);
        }
      }, 50);

      return;
    }

    if (formLoading) return;

    setFormLoading(true);
    setSubmitButtonStatus("loading");
    setErrorMsg(null);
    setSuccessMsg(null);

    let activeTeamId = createdTeamId;

    try {
      // Step 1: Update/Save Leader Profile
      setFormStatus("updating_profile");
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: leaderForm.full_name,
          phone: leaderForm.phone,
          gender: leaderForm.gender,
          university: leaderForm.university,
          department: leaderForm.department,
          semester: leaderForm.semester,
          student_id: leaderForm.student_id,
          tshirt_size: leaderForm.tshirt_size,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileData.success) {
        throw new Error(profileData.message || "Failed to save team leader profile.");
      }

      // Step 2: Create Team (if not already created in a previous retry attempt)
      if (!activeTeamId) {
        setFormStatus("creating_team");
        const teamRes = await fetch("/api/teams?action=create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: teamName,
            competition_id: compId,
          }),
        });

        const teamData = await teamRes.json();
        if (!teamData.success) {
          throw new Error(teamData.message || "Failed to create team.");
        }
        activeTeamId = teamData.data.id;
        setCreatedTeamId(activeTeamId);
      }

      // Step 3: Add Teammates sequentially
      if (activeTeamId) {
        setFormStatus("adding_members");
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const mNum = i + 2;

          // Skip if teammate already added during a prior failed attempt
          if (addedMemberEmails.includes(member.email.trim().toLowerCase())) {
            continue;
          }

          setCurrentMemberIndex(mNum);

          const memberRes = await fetch("/api/teams?action=add_member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              team_id: activeTeamId,
              full_name: member.full_name,
              email: member.email,
              phone: member.phone,
              gender: member.gender,
              university: member.university,
              department: member.department,
              semester: member.semester,
              student_id: member.student_id,
              tshirt_size: member.tshirt_size,
              id_front_base64: null,
              id_back_base64: null,
            }),
          });

          const memberData = await memberRes.json();
          if (!memberData.success) {
            throw new Error(
              memberData.message || `Failed to add Teammate ${mNum} (${member.full_name}).`
            );
          }

          // Register in state so we don't re-upload on retries
          setAddedMemberEmails((prev) => [...prev, member.email.trim().toLowerCase()]);
        }
      }

      // Step 4: Submission Upload (if required)
      if (competition?.submissionRequired && activeTeamId) {
        setFormStatus("submitting_proposal");
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("team_id", activeTeamId);
        formData.append("title", projectTitle);
        if (projectNotes) {
          formData.append("notes", projectNotes);
        }
        if (pdfFile) {
          formData.append("pdf", pdfFile);
        }
        if (videoFile) {
          formData.append("video", videoFile);
        }

        // Upload using XHR for progress support
        const uploadResult = await new Promise<{ success: boolean; message?: string }>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
              }
            });

            xhr.addEventListener("load", () => {
              try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(data);
                } else {
                  reject(new Error(data.message || `Proposal upload failed: status ${xhr.status}`));
                }
              } catch {
                reject(new Error("Failed to parse server response."));
              }
            });

            xhr.addEventListener("error", () => {
              reject(new Error("Network error during file upload. Please verify connection."));
            });

            xhr.open("POST", "/api/submissions?skipTimeWindowCheck=true");
            xhr.send(formData);
          }
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.message || "Failed to submit project proposal.");
        }
        setUploadProgress(100);
      }

      // Success!
      setFormStatus("success");
      setSubmitButtonStatus("success");
      setSuccessMsg("Registration and project submission completed successfully!");
      
      // Delay redirection to let success state display
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err: any) {
      console.error("Submit flow failure:", err);
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
      setSubmitButtonStatus("failure");
      setFormLoading(false);
    }
  };

  const isUploading = formLoading && uploadProgress > 0 && uploadProgress < 100;
  const isProcessing = formLoading && uploadProgress >= 100;

  // Render Loader
  if (compLoading || (user && checkingRegistration)) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
        <Navbar />
        <main className="grow mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-neutral-400 font-sans">Initializing registration workspace...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Render Error
  if (compErr || !competition) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="grow flex flex-col items-center justify-center py-24 px-4 text-center">
          <AlertCircle className="h-12 w-12 text-error mb-4" />
          <h2 className="text-2xl font-heading font-extrabold text-neutral-300 mb-4">
            Failed to Load Competition
          </h2>
          <p className="text-sm text-neutral-500 font-sans mb-6">
            The requested competition details could not be loaded. Please try again later.
          </p>
          <Link href="/competitions">
            <Button className="bg-primary text-white font-sans font-bold">Return to Catalog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
      <Navbar />

      <main className="flex-1 mx-auto max-w-[800px] pt-10 pb-20 px-4 w-full space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href={`/competitions/${compId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Competition Page</span>
          </Link>
        </div>

        {/* Form Title Header */}
        <div className="relative rounded-2xl border border-neutral-850 bg-neutral-950 p-6 md:p-8 overflow-hidden">
          {(competition.bannerImageUrl || competition.coverImageUrl || COMPETITION_IMAGES[competition.id]) ? (
            <>
              <Image
                src={competition.bannerImageUrl || competition.coverImageUrl || COMPETITION_IMAGES[competition.id] || ""}
                alt={competition.name}
                fill
                className="object-cover opacity-10 pointer-events-none"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-r from-neutral-950 via-neutral-950/85 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent pointer-events-none" />
          )}
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-neutral-500 font-mono font-semibold">
                Team size: {competition.minMembers === competition.maxMembers 
                  ? `${competition.minMembers} Members` 
                  : `${competition.minMembers} - ${competition.maxMembers} Members`}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-neutral-50 tracking-tight uppercase">
              REGISTER: {competition.name}
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 font-sans leading-relaxed">
              Fill out this form to register your team. Ensure all members match eligibility rules.
            </p>
          </div>
        </div>

        {/* Global Warnings / Info */}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-sans font-semibold flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-sans font-semibold flex items-start gap-2.5 animate-fade-in">
            <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Authentication Wall */}
        {authLoading ? (
          <Card variant="glass" className="bg-glass border-glass p-8 flex flex-col items-center space-y-4">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-xs text-neutral-400 font-sans">Checking session status...</p>
          </Card>
        ) : !user ? (
          <Card variant="glass" className="bg-glass border-glass p-8 text-center space-y-6">
            <div className="space-y-2 max-w-md mx-auto">
              <Trophy className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-lg font-heading font-bold text-neutral-200">
                Register as Team Leader
              </h2>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                You must be authenticated to create a team. The authenticated user is automatically designated as the <strong>Team Leader</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <Button
                onClick={handleGoogleSignIn}
                className="grow bg-neutral-50 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 font-sans font-bold flex items-center justify-center py-2.5 h-auto text-base rounded-md shadow-xs transition-all active:scale-[0.98]"
              >
                {/* Custom Google SVG */}
                <svg className="h-4.5 w-4.5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </Button>
              <Link href={`/login?redirectTo=/competitions/${compId}/register`} className="grow">
                <Button variant="secondary" className="w-full text-base font-sans py-2.5 h-auto rounded-md">
                  Sign In with Email
                </Button>
              </Link>
            </div>
          </Card>
        ) : alreadyRegistered ? (
          <Card variant="glass" className="border-warning/30 bg-warning/10 p-8 text-center space-y-5">
            <AlertTriangle className="h-10 w-10 text-warning mx-auto animate-pulse" />
            <div className="space-y-2">
              <h3 className="text-base font-heading font-bold text-amber-300">Already Registered</h3>
              <p className="text-xs text-warning/80 font-sans leading-relaxed max-w-md mx-auto">
                You are already registered for a team in this competition. To review or update your team, please navigate to your dashboard.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard">
                <Button className="bg-primary text-white font-sans text-base px-5 py-2 rounded-md">
                  Go to Dashboard
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-xs border border-neutral-800 text-neutral-400 hover:text-neutral-200"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          </Card>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} noValidate className="space-y-8 font-sans select-text">
            {/* Team details */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardHeader className="border-b border-neutral-850 pb-4">
                <CardTitle className="text-lg md:text-xl font-heading font-bold text-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Team Details</span>
                  </span>
                  <span className={`text-xs font-sans font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                    isTeamDetailsComplete 
                      ? "bg-success/10 border-success/20 text-success" 
                      : "bg-warning/10 border-warning/20 text-warning"
                  }`}>
                    {isTeamDetailsComplete ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {isTeamDetailsComplete ? "Team Details Complete" : "Team Details Incomplete"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Input
                  label="Team Name"
                  placeholder="e.g. Code Gladiators"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    handleBlur('teamName');
                  }}
                  onBlur={() => handleBlur('teamName')}
                  error={getFieldError('teamName')}
                  isValid={isValidField('teamName', teamName)}
                  disabled={formLoading}
                  required
                  helperText="Must be unique. 3 characters minimum."
                />
              </CardContent>
            </Card>

            {/* Team Leader details */}
            <Card variant="glass" className="bg-glass border-glass">
              <CardHeader className="border-b border-neutral-850 pb-4">
                <CardTitle className="text-lg md:text-xl font-heading font-bold text-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                  <span className="flex items-center gap-2">
                    <CrownIcon />
                    <span>Team Leader Details (You)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-sans font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                      isLeaderComplete 
                        ? "bg-success/10 border-success/20 text-success" 
                        : "bg-warning/10 border-warning/20 text-warning"
                    }`}>
                      {isLeaderComplete ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {isLeaderComplete ? "Team Leader Complete" : "Team Leader Incomplete"}
                    </span>
                    <Badge variant="secondary" className="text-sm font-mono tracking-widest uppercase">
                      Leader
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {profileLoading && (
                  <p className="text-sm text-primary animate-pulse">Pre-filling profile details...</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    value={leaderForm.full_name}
                    onChange={(e) => {
                      handleLeaderChange("full_name", e.target.value);
                      handleBlur('leader_full_name');
                    }}
                    onBlur={() => handleBlur('leader_full_name')}
                    error={getFieldError('leader_full_name')}
                    isValid={isValidField('leader_full_name', leaderForm.full_name)}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={leaderForm.email}
                    disabled={true} // Readonly email
                    className="opacity-55 cursor-not-allowed bg-neutral-900/50"
                  />
                  <Input
                    label="Phone Number"
                    placeholder="e.g. 01712345678"
                    value={leaderForm.phone}
                    onChange={(e) => {
                      handleLeaderChange("phone", e.target.value);
                      handleBlur('leader_phone');
                    }}
                    onBlur={() => handleBlur('leader_phone')}
                    error={getFieldError('leader_phone')}
                    isValid={isValidField('leader_phone', leaderForm.phone)}
                    disabled={formLoading}
                    required
                  />
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-sm font-medium text-neutral-350 select-none">
                      Gender
                    </label>
                    <div className="relative w-full flex items-center">
                      <select
                        value={leaderForm.gender}
                        onChange={(e) => {
                          handleLeaderChange("gender", e.target.value);
                          handleBlur('leader_gender');
                        }}
                        onBlur={() => handleBlur('leader_gender')}
                        disabled={formLoading}
                        required
                        className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm text-neutral-200 outline-none transition-colors cursor-pointer ${
                          isInvalid('leader_gender')
                            ? "border-[#EF4444] bg-[#FFFFFF] dark:bg-[#EF4444]/4 text-[#111827] dark:text-neutral-50 focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/15 dark:focus:ring-[#EF4444]/18"
                            : isValidField('leader_gender', leaderForm.gender)
                            ? "border-[#10B981] dark:border-[#34D399] bg-neutral-950 focus:border-[#10B981] dark:focus:border-[#34D399]"
                            : "border-neutral-800 bg-neutral-950 focus:border-primary focus:ring-1 focus:ring-primary"
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {isInvalid('leader_gender') && (
                        <span className="absolute right-8 text-[#DC2626] dark:text-[#EF4444] flex items-center pointer-events-none animate-fade-in">
                          <AlertCircle className="h-4.5 w-4.5" />
                        </span>
                      )}
                      {isValidField('leader_gender', leaderForm.gender) && (
                        <span className="absolute right-8 text-[#10B981] dark:text-[#34D399] flex items-center pointer-events-none animate-fade-in">
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </span>
                      )}
                    </div>
                    {isInvalid('leader_gender') ? (
                      <span className="text-xs text-[#DC2626] dark:text-[#FCA5A5] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                        <span>✖</span> {allErrors['leader_gender']}
                      </span>
                    ) : isValidField('leader_gender', leaderForm.gender) ? (
                      <span className="text-xs text-[#10B981] dark:text-[#34D399] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                        <span>✓</span>
                      </span>
                    ) : null}
                  </div>
                  <Input
                    label="University"
                    placeholder="e.g. SMUCT"
                    value={leaderForm.university}
                    onChange={(e) => {
                      handleLeaderChange("university", e.target.value);
                      handleBlur('leader_university');
                    }}
                    onBlur={() => handleBlur('leader_university')}
                    error={getFieldError('leader_university')}
                    isValid={isValidField('leader_university', leaderForm.university)}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Department"
                    placeholder="e.g. CSE"
                    value={leaderForm.department}
                    onChange={(e) => {
                      handleLeaderChange("department", e.target.value);
                      handleBlur('leader_department');
                    }}
                    onBlur={() => handleBlur('leader_department')}
                    error={getFieldError('leader_department')}
                    isValid={isValidField('leader_department', leaderForm.department)}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Semester"
                    placeholder="e.g. 8th"
                    value={leaderForm.semester}
                    onChange={(e) => {
                      handleLeaderChange("semester", e.target.value);
                      handleBlur('leader_semester');
                    }}
                    onBlur={() => handleBlur('leader_semester')}
                    error={getFieldError('leader_semester')}
                    isValid={isValidField('leader_semester', leaderForm.semester)}
                    disabled={formLoading}
                    required
                  />
                  <Input
                    label="Student ID"
                    placeholder="e.g. 211071032"
                    value={leaderForm.student_id}
                    onChange={(e) => {
                      handleLeaderChange("student_id", e.target.value);
                      handleBlur('leader_student_id');
                    }}
                    onBlur={() => handleBlur('leader_student_id')}
                    error={getFieldError('leader_student_id')}
                    isValid={isValidField('leader_student_id', leaderForm.student_id)}
                    disabled={formLoading}
                    required
                  />
                  <div className="flex flex-col space-y-1.5 w-full sm:col-span-2">
                    <label className="text-sm font-medium text-neutral-350 select-none font-sans">
                      T-shirt Size
                    </label>
                    <div className={`p-2 rounded-lg border transition-all duration-200 ${
                      isInvalid('leader_tshirt_size')
                        ? "border-[#EF4444] bg-[#EF4444]/4"
                        : "border-transparent"
                    }`}>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {["S", "M", "L", "XL", "XXL"].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              handleLeaderChange("tshirt_size", size);
                              handleBlur('leader_tshirt_size');
                            }}
                            disabled={formLoading}
                            className={`px-4 py-2 border rounded-lg text-xs font-bold font-sans transition-all duration-150 ${
                              leaderForm.tshirt_size === size
                                ? "bg-primary text-white border-primary shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isInvalid('leader_tshirt_size') ? (
                      <span className="text-xs text-[#DC2626] dark:text-[#FCA5A5] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                        <span>✖</span> {allErrors['leader_tshirt_size']}
                      </span>
                    ) : isValidField('leader_tshirt_size', leaderForm.tshirt_size) ? (
                      <span className="text-xs text-[#10B981] dark:text-[#34D399] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                        <span>✓</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teammates section */}
            {members.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
                  <h3 className="text-lg md:text-xl font-heading font-bold text-neutral-100 flex items-center gap-2">
                    <Users className="h-5 w-5 text-secondary" />
                    <span>Teammates Details</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-sans font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                      isTeammatesComplete 
                        ? "bg-success/10 border-success/20 text-success" 
                        : "bg-warning/10 border-warning/20 text-warning"
                    }`}>
                      {isTeammatesComplete ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {isTeammatesComplete ? "Teammates Details Complete" : "Teammates Details Incomplete"}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      Roster count: {members.length + 1} of {competition.maxMembers} max
                    </span>
                  </div>
                </div>

                {members.map((member, index) => {
                  const mNum = index + 2;
                  const isMemComplete = !Object.keys(allErrors).some(k => k.startsWith(`member_${index}_`));
                  return (
                    <Card
                      key={index}
                      variant="glass"
                      className="bg-glass border-glass animate-fade-in relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary/70" />
                      <CardHeader className="border-b border-neutral-850 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base md:text-lg font-heading font-bold text-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                          <span>Member {mNum} Details</span>
                          <span className={`text-xs font-sans font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                            isMemComplete 
                              ? "bg-success/10 border-success/20 text-success" 
                              : "bg-warning/10 border-warning/20 text-warning"
                          }`}>
                            {isMemComplete ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {isMemComplete ? `Member ${mNum} Complete` : `Member ${mNum} Missing Information`}
                          </span>
                        </CardTitle>
                        {/* Show delete only if count is greater than the required min size (leader counts as 1) */}
                        {members.length + 1 > competition.minMembers && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveMember(index)}
                            disabled={formLoading}
                            className="p-1 h-auto text-neutral-500 hover:text-error hover:bg-neutral-800/40 rounded transition-colors ml-2"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Full Name"
                            placeholder="Teammate Full Name"
                            value={member.full_name}
                            onChange={(e) => {
                              handleMemberChange(index, "full_name", e.target.value);
                              handleBlur(`member_${index}_full_name`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_full_name`)}
                            error={getFieldError(`member_${index}_full_name`)}
                            isValid={isValidField(`member_${index}_full_name`, member.full_name)}
                            disabled={formLoading}
                            required
                          />
                          <Input
                            label="Email Address"
                            type="email"
                            placeholder="member@email.com"
                            value={member.email}
                            onChange={(e) => {
                              handleMemberChange(index, "email", e.target.value);
                              handleBlur(`member_${index}_email`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_email`)}
                            error={getFieldError(`member_${index}_email`)}
                            isValid={isValidField(`member_${index}_email`, member.email)}
                            disabled={formLoading || addedMemberEmails.includes(member.email.trim().toLowerCase())}
                            required
                            helperText={
                              addedMemberEmails.includes(member.email.trim().toLowerCase())
                                ? "Teammate added successfully."
                                : undefined
                            }
                            className={
                              addedMemberEmails.includes(member.email.trim().toLowerCase())
                                ? "border-success/30 text-success bg-success/5 opacity-80"
                                : ""
                            }
                          />
                          <Input
                            label="Phone Number"
                            placeholder="Phone number"
                            value={member.phone}
                            onChange={(e) => {
                              handleMemberChange(index, "phone", e.target.value);
                              handleBlur(`member_${index}_phone`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_phone`)}
                            error={getFieldError(`member_${index}_phone`)}
                            isValid={isValidField(`member_${index}_phone`, member.phone)}
                            disabled={formLoading}
                            required
                          />
                          <div className="flex flex-col space-y-1.5 w-full">
                            <label className="text-sm font-medium text-neutral-350 select-none">
                              Gender
                            </label>
                            <div className="relative w-full flex items-center">
                              <select
                                value={member.gender}
                                onChange={(e) => {
                                  handleMemberChange(index, "gender", e.target.value);
                                  handleBlur(`member_${index}_gender`);
                                }}
                                onBlur={() => handleBlur(`member_${index}_gender`)}
                                disabled={formLoading}
                                required
                                className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm text-neutral-200 outline-none transition-colors cursor-pointer ${
                                  isInvalid(`member_${index}_gender`)
                                    ? "border-[#EF4444] bg-[#FFFFFF] dark:bg-[#EF4444]/4 text-[#111827] dark:text-neutral-50 focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/15 dark:focus:ring-[#EF4444]/18"
                                    : isValidField(`member_${index}_gender`, member.gender)
                                    ? "border-[#10B981] dark:border-[#34D399] bg-neutral-950 focus:border-[#10B981] dark:focus:border-[#34D399]"
                                    : "border-neutral-800 bg-neutral-950 focus:border-primary focus:ring-1 focus:ring-primary"
                                }`}
                              >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                              {isInvalid(`member_${index}_gender`) && (
                                <span className="absolute right-8 text-[#DC2626] dark:text-[#EF4444] flex items-center pointer-events-none animate-fade-in">
                                  <AlertCircle className="h-4.5 w-4.5" />
                                </span>
                              )}
                              {isValidField(`member_${index}_gender`, member.gender) && (
                                <span className="absolute right-8 text-[#10B981] dark:text-[#34D399] flex items-center pointer-events-none animate-fade-in">
                                  <CheckCircle2 className="h-4.5 w-4.5" />
                                </span>
                              )}
                            </div>
                            {isInvalid(`member_${index}_gender`) ? (
                              <span className="text-xs text-[#DC2626] dark:text-[#FCA5A5] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                                <span>✖</span> {allErrors[`member_${index}_gender`]}
                              </span>
                            ) : isValidField(`member_${index}_gender`, member.gender) ? (
                              <span className="text-xs text-[#10B981] dark:text-[#34D399] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                                <span>✓</span>
                              </span>
                            ) : null}
                          </div>
                          <Input
                            label="University"
                            placeholder="University"
                            value={member.university}
                            onChange={(e) => {
                              handleMemberChange(index, "university", e.target.value);
                              handleBlur(`member_${index}_university`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_university`)}
                            error={getFieldError(`member_${index}_university`)}
                            isValid={isValidField(`member_${index}_university`, member.university)}
                            disabled={formLoading}
                            required
                          />
                          <Input
                            label="Department"
                            placeholder="Department"
                            value={member.department}
                            onChange={(e) => {
                              handleMemberChange(index, "department", e.target.value);
                              handleBlur(`member_${index}_department`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_department`)}
                            error={getFieldError(`member_${index}_department`)}
                            isValid={isValidField(`member_${index}_department`, member.department)}
                            disabled={formLoading}
                            required
                          />
                          <Input
                            label="Semester"
                            placeholder="Semester"
                            value={member.semester}
                            onChange={(e) => {
                              handleMemberChange(index, "semester", e.target.value);
                              handleBlur(`member_${index}_semester`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_semester`)}
                            error={getFieldError(`member_${index}_semester`)}
                            isValid={isValidField(`member_${index}_semester`, member.semester)}
                            disabled={formLoading}
                            required
                          />
                          <Input
                            label="Student ID"
                            placeholder="Student ID"
                            value={member.student_id}
                            onChange={(e) => {
                              handleMemberChange(index, "student_id", e.target.value);
                              handleBlur(`member_${index}_student_id`);
                            }}
                            onBlur={() => handleBlur(`member_${index}_student_id`)}
                            error={getFieldError(`member_${index}_student_id`)}
                            isValid={isValidField(`member_${index}_student_id`, member.student_id)}
                            disabled={formLoading}
                            required
                          />
                          <div className="flex flex-col space-y-1.5 w-full sm:col-span-2">
                            <label className="text-sm font-medium text-neutral-350 select-none font-sans">
                              T-shirt Size
                            </label>
                            <div className={`p-2 rounded-lg border transition-all duration-200 ${
                              isInvalid(`member_${index}_tshirt_size`)
                                ? "border-[#EF4444] bg-[#EF4444]/4"
                                : "border-transparent"
                            }`}>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {["S", "M", "L", "XL", "XXL"].map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                      handleMemberChange(index, "tshirt_size", size);
                                      handleBlur(`member_${index}_tshirt_size`);
                                    }}
                                    disabled={formLoading}
                                    className={`px-4 py-2 border rounded-lg text-xs font-bold font-sans transition-all duration-150 ${
                                      member.tshirt_size === size
                                        ? "bg-secondary text-white border-secondary shadow-[0_0_12px_rgba(236,72,153,0.25)]"
                                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                                    }`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {isInvalid(`member_${index}_tshirt_size`) ? (
                              <span className="text-xs text-[#DC2626] dark:text-[#FCA5A5] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                                <span>✖</span> {allErrors[`member_${index}_tshirt_size`]}
                              </span>
                            ) : isValidField(`member_${index}_tshirt_size`, member.tshirt_size) ? (
                              <span className="text-xs text-[#10B981] dark:text-[#34D399] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in">
                                <span>✓</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add teammate button */}
            {competition && members.length + 1 < competition.maxMembers && (
              <Button
                type="button"
                onClick={handleAddMember}
                disabled={formLoading}
                className="w-full py-4 border-2 border-[#8B5CF6] dark:border-[#8B5CF6]/60 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 text-[#8B5CF6] dark:text-[#C084FC] hover:bg-[#8B5CF6]/20 dark:hover:bg-[#8B5CF6]/25 h-auto rounded-xl font-heading text-base font-black tracking-widest cursor-pointer hover:shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5 text-[#8B5CF6] dark:text-[#C084FC]" />
                <span>Add Member {members.length + 2}</span>
              </Button>
            )}

            {/* Project submission section */}
            {competition.submissionRequired && (
              <Card variant="glass" className="bg-glass border-glass">
                <CardHeader className="border-b border-neutral-850 pb-4">
                  <CardTitle className="text-lg md:text-xl font-heading font-bold text-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                    <span className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-accent" />
                      <span>Project Submission Details</span>
                    </span>
                    <span className={`text-xs font-sans font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                      isProjectComplete 
                        ? "bg-success/10 border-success/20 text-success" 
                        : "bg-warning/10 border-warning/20 text-warning"
                    }`}>
                      {isProjectComplete ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {isProjectComplete ? "Project Details Complete" : "Project Details Incomplete"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <Input
                    label="Project Title"
                    placeholder="e.g. Smart IoT Agriculture Tracker"
                    value={projectTitle}
                    onChange={(e) => {
                      setProjectTitle(e.target.value);
                      handleBlur('projectTitle');
                    }}
                    onBlur={() => handleBlur('projectTitle')}
                    error={getFieldError('projectTitle')}
                    isValid={isValidField('projectTitle', projectTitle)}
                    disabled={formLoading}
                    required
                  />

                  <FileDropzone
                    label="Project PDF Report (Optional)"
                    accept="application/pdf"
                    maxSizeMB={5}
                    required={false}
                    value={pdfFile}
                    onChange={setPdfFile}
                    helperText="Optional. Upload your project proposal in PDF format"
                    disabled={formLoading}
                  />

                  <FileDropzone
                    label="Demo Video (Optional)"
                    accept="video/*"
                    maxSizeMB={200}
                    value={videoFile}
                    onChange={setVideoFile}
                    helperText="Optional. MP4/WebM, max 200 MB. Compress before uploading."
                    disabled={formLoading}
                  />

                  {/* Video compression tips */}
                  <div className="text-sm text-neutral-500 font-sans leading-relaxed space-y-1 p-3 bg-neutral-950/60 border border-neutral-850 rounded-lg">
                    <p className="font-semibold text-neutral-400">📹 Video Upload Tips</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>Compress to under 100 MB for faster upload — use <span className="font-mono text-neutral-400">HandBrake</span> (free) or online tools</li>
                      <li>Supported formats: <span className="font-mono text-neutral-400">MP4, WebM</span></li>
                      <li>Maximum size: <span className="font-mono text-neutral-400">200 MB</span></li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Status & Progress Indicator */}
            {formLoading && (
              <div className="space-y-3 p-4 bg-neutral-950/80 border border-neutral-850 rounded-xl animate-fade-in font-sans">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
                  <p className="text-xs font-semibold text-neutral-200">
                    {formStatus === "updating_profile" && "Saving team leader profile..."}
                    {formStatus === "creating_team" && "Registering team workspace..."}
                    {formStatus === "adding_members" && `Registering Teammate ${currentMemberIndex} of ${members.length + 1}...`}
                    {formStatus === "submitting_proposal" && (
                      isProcessing ? "Processing files on server..." : "Uploading project files..."
                    )}
                    {formStatus === "success" && "Registration complete!"}
                  </p>
                </div>

                {formStatus === "submitting_proposal" && uploadProgress > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-sm font-mono">
                      <span className="text-neutral-500">Progress</span>
                      <span className="text-neutral-300 font-bold tabular-nums">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Big Action Submit Button */}
            <div className="pt-4 space-y-4">
              {/* Validation Summary Alert Container */}
              {submittedOnce && Object.keys(allErrors).length > 0 && (
                <div className="p-4 rounded-xl border bg-[#FEF2F2] dark:bg-red-500/12 border-[#EF4444] dark:border-red-500/40 text-[#991B1B] dark:text-[#FCA5A5] animate-fade-in transition-all duration-300">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-[#DC2626] dark:text-[#EF4444] mt-0.5" />
                    <div className="space-y-2 text-sm w-full">
                      <p className="font-semibold font-sans">Please complete all required fields before submitting.</p>
                      <div className="space-y-1">
                        <p className="text-xs font-mono uppercase tracking-wider opacity-85">Missing / Invalid Fields:</p>
                        <ul className="list-disc list-inside text-xs space-y-1 pl-1 font-sans opacity-95">
                          {Object.keys(allErrors).map((key) => (
                            <li key={key}>{getFieldFriendlyName(key, competition)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={formLoading || submitButtonStatus === "success"}
                className={`w-full py-4 h-auto rounded-md text-base font-bold font-sans flex items-center justify-center gap-2 transition-all duration-300 select-none cursor-pointer ${
                  submitButtonStatus === "success"
                    ? "bg-success hover:bg-success/95 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    : submitButtonStatus === "failure"
                    ? "bg-error hover:bg-error/95 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                    : "bg-primary hover:bg-primary/95 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                }`}
              >
                {submitButtonStatus === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
                {submitButtonStatus === "success" && <Check className="h-5 w-5" />}
                {submitButtonStatus === "failure" && <AlertCircle className="h-5 w-5" />}
                {submitButtonStatus === "idle" && <Send className="h-4 w-4" />}

                <span>
                  {submitButtonStatus === "idle" && "Register & Submit Team"}
                  {submitButtonStatus === "loading" && "Submitting..."}
                  {submitButtonStatus === "success" && "Registration Submitted Successfully"}
                  {submitButtonStatus === "failure" && "Submission Failed. Please fix the highlighted errors."}
                </span>
              </Button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Inline Custom Crown Icon
function CrownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1z" />
    </svg>
  );
}

// Field friendly name helper for validation summary
function getFieldFriendlyName(key: string, competition: any): string {
  if (key === "teamName") return "Team Name";
  if (key === "projectTitle") return "Project Title";
  
  if (key.startsWith("leader_")) {
    const field = key.replace("leader_", "");
    const cleanField = field.replace("_", " ");
    return `Team Leader ${cleanField.charAt(0).toUpperCase() + cleanField.slice(1)}`;
  }
  
  if (key.startsWith("member_")) {
    const parts = key.split("_");
    const index = parseInt(parts[1], 10);
    const field = parts.slice(2).join(" ");
    return `Member ${index + 2} ${field.charAt(0).toUpperCase() + field.slice(1)}`;
  }
  
  return key;
}
