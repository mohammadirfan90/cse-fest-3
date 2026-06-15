"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Loader2 } from "lucide-react";

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    }
    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
        <Navbar />
        <main className="grow mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-neutral-400 font-sans">Verifying security session...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background bg-grid-pattern">
      <Navbar />
      <main className="flex-1 mx-auto max-w-[1280px] pt-10 pb-20 px-4 md:px-16 w-full relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
