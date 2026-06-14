import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glow";
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-md border border-neutral-800/80 p-6 shadow-level-1",
            {
              // Default: Card Background (neutral-900 Surface 2)
              "bg-neutral-900 text-neutral-50": variant === "default",
              // Glassmorphism: Allowed on stats, hero, navbar, modals
              "bg-neutral-900/60 backdrop-blur-md border-neutral-700/50 text-neutral-50": variant === "glass",
              // Glow: Premium glowing card matching hero / brand
              "bg-neutral-900 border-primary/30 shadow-level-4 text-neutral-50": variant === "glow",
              // Hoverable interaction: scale(1.02), shadow increase, normal 250ms duration
              "transition-all duration-normal hover:scale-[1.02] hover:shadow-level-2 hover:border-neutral-700 cursor-pointer": hoverable,
            },
            className
          )
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx("flex flex-col space-y-1.5 mb-4", className))} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge(clsx("text-lg font-semibold font-heading tracking-tight leading-none text-neutral-50", className))}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge(clsx("text-sm text-neutral-400 font-sans", className))}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx("font-sans text-neutral-200", className))} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx("flex items-center mt-6 pt-4 border-t border-neutral-800/60", className))} {...props} />
  )
);
CardFooter.displayName = "CardFooter";
