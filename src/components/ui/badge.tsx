import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "accent" | "neutral";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-sans tracking-wide select-none border border-transparent transition-colors",
          {
            // Primary: Indigo badge
            "bg-primary/10 border-primary/20 text-primary": variant === "primary",
            // Secondary: Violet badge
            "bg-secondary/10 border-secondary/20 text-secondary": variant === "secondary",
            // Success: Green badge (Verified, Approved)
            "bg-success/10 border-success/20 text-success": variant === "success",
            // Warning: Amber badge (Pending, Resubmission Required)
            "bg-warning/10 border-warning/20 text-warning": variant === "warning",
            // Error: Red badge (Rejected)
            "bg-error/10 border-error/20 text-error": variant === "error",
            // Accent: Cyan badge
            "bg-accent/10 border-accent/20 text-accent": variant === "accent",
            // Neutral: Default slate badge
            "bg-neutral-800 border-neutral-700 text-neutral-300": variant === "neutral",
          },
          className
        )
      )}
      {...props}
    />
  );
}
