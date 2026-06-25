import * as React from "react";
import { Building2, Globe2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SMUCT_INSTITUTION,
  isInternal,
  normalizeEligibility,
} from "@/lib/eligibility";

/**
 * Small visual badge that surfaces a competition's eligibility at a glance.
 *
 * Renders two visual states:
 *  - `internal`  → primary-tinted badge with a building icon
 *  - `both`      → success-tinted badge with a globe icon
 *
 * `className` is forwarded to the underlying Badge so the badge can be
 * inlined inside headers, cards, or catalog grids without restyling.
 */
export interface EligibilityBadgeProps {
  eligibility: string | null | undefined;
  className?: string;
  /** Show a trailing "SMUCT only" / "All universities" hint inside the label. */
  withHint?: boolean;
  competitionName?: string;
}

export function EligibilityBadge({
  eligibility,
  className,
  withHint = true,
  competitionName,
}: EligibilityBadgeProps) {
  const normalized = normalizeEligibility(eligibility);
  const internal = isInternal(normalized);
  const isIdea = competitionName?.toLowerCase().includes("idea");

  const label = internal ? "SMUCT Only" : isIdea ? "College Only" : "All Universities";

  return (
    <Badge
      variant={internal ? "primary" : "success"}
      className={className}
      title={
        internal
          ? `This competition is restricted to ${SMUCT_INSTITUTION} students only.`
          : isIdea
          ? "This competition accepts students from any college."
          : "This competition accepts students from any university."
      }
    >
      {internal ? (
        <Building2 className="h-3.5 w-3.5 mr-1.5" />
      ) : (
        <Globe2 className="h-3.5 w-3.5 mr-1.5" />
      )}
      <span className="text-xs font-mono uppercase tracking-widest">
        {label}
      </span>
      {withHint && (
        <span className="ml-1.5 text-[10px] font-sans font-medium opacity-80 hidden sm:inline">
          · Eligibility: {isIdea ? "College Only" : normalized}
        </span>
      )}
    </Badge>
  );
}
