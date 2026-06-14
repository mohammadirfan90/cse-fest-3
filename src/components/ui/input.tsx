import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, disabled, id, ...props }, ref) => {
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
              "flex h-10 w-full rounded-lg border bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium font-sans",
              {
                "border-neutral-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none": !error,
                "border-error focus:border-error focus:ring-1 focus:ring-error outline-none": error,
                "opacity-50 pointer-events-none bg-neutral-900/55": disabled,
              },
              className
            )
          )}
          {...props}
        />
        {error ? (
          <span
            id={`${inputId}-error`}
            className="text-xs text-error font-sans font-medium tracking-tight"
          >
            {error}
          </span>
        ) : helperText ? (
          <span
            id={`${inputId}-helper`}
            className="text-xs text-neutral-500 font-sans"
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
