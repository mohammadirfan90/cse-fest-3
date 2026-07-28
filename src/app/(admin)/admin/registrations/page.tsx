"use client";

import * as React from "react";
import { Users } from "lucide-react";
import RegistrationsList from "@/components/admin/RegistrationsList";

export default function AdminRegistrationsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-sidebar-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <span>Registrations Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Monitor and review segment-wise registrations, team rosters, and payment statuses for SMUCT CSE Fest 2026.
          </p>
        </div>
      </div>

      <RegistrationsList />
    </div>
  );
}
