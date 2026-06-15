import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isValid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, isValid, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-300 font-sans select-none"
          >
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            className={twMerge(
              clsx(
                "flex h-11 w-full rounded-lg border bg-neutral-950 px-3.5 py-2.5 pr-10 text-sm text-neutral-50 placeholder:text-neutral-600 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium font-sans",
                {
                  "border-neutral-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none": !error && !isValid,
                  // Invalid field styling
                  "border-[#EF4444] bg-[#FFFFFF] dark:bg-[#EF4444]/4 text-[#111827] dark:text-neutral-50 focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/15 dark:focus:ring-[#EF4444]/18 outline-none": !!error,
                  // Success field styling
                  "border-[#10B981] dark:border-[#34D399] focus:border-[#10B981] dark:focus:border-[#34D399] focus:ring-1 focus:ring-[#10B981]/15 outline-none": isValid && !error,
                  "opacity-50 pointer-events-none bg-neutral-900/55": disabled,
                },
                className
              )
            )}
            {...props}
          />
          {error && (
            <span className="absolute right-3 text-[#DC2626] dark:text-[#EF4444] flex items-center pointer-events-none animate-fade-in">
              <AlertCircle className="h-4.5 w-4.5" />
            </span>
          )}
          {isValid && !error && (
            <span className="absolute right-3 text-[#10B981] dark:text-[#34D399] flex items-center pointer-events-none animate-fade-in">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
          )}
        </div>
        {error ? (
          <span
            id={`${inputId}-error`}
            className="text-xs text-[#DC2626] dark:text-[#FCA5A5] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in"
          >
            <span>✖</span> {error}
          </span>
        ) : isValid && !error ? (
          <span
            className="text-xs text-[#10B981] dark:text-[#34D399] font-sans font-medium tracking-tight flex items-center gap-1 mt-1 animate-fade-in"
          >
            <span>✓</span>
          </span>
        ) : helperText ? (
          <span
            id={`${inputId}-helper`}
            className="text-xs text-neutral-500 font-sans mt-1"
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
