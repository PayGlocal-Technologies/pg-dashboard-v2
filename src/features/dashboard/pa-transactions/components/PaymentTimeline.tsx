import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  SettlementTimelineStepper,
  type SettlementStepStatus,
} from "@/features/dashboard/mca-transactions/components/SettlementTimelineStepper";

export type TimelineStepState = "complete" | "current" | "pending" | "danger";

export interface TimelineStep {
  /** Stable React key, falls back to `label` when omitted. Required once a
   * timeline can have two steps sharing the same label (e.g. two separate
   * "Partially refunded" entries for two different refunds). */
  id?: string;
  label: string;
  description?: ReactNode;
  state: TimelineStepState;
}

// A plain dot, colored by state, no icon glyph, kept deliberately understated
// so the timeline reads as a simple progress trail rather than a row of
// badges.
const DOT_CLASS: Record<TimelineStepState, string> = {
  complete: "bg-emerald-500",
  current: "border-2 border-amber-500 bg-card",
  danger: "bg-red-500",
  pending: "bg-muted-foreground/30",
};

/** Each state as the MCA timeline draws it: a tick once done, a dot while in
 *  progress, an alert where it went against the merchant. */
const STEPPER_STATUS: Record<TimelineStepState, SettlementStepStatus> = {
  complete: "success",
  current: "inProgress",
  danger: "error",
  pending: "pending",
};

export function PaymentTimeline({
  steps,
  variant = "dots",
}: {
  steps: TimelineStep[];
  /** "ticks": the MCA Transactions timeline (small ticks joined by a line
   *  that fills in), used by every dispute timeline. "dots" (default): the
   *  plain dot trail of the transaction and refund pages. */
  variant?: "dots" | "ticks";
}) {
  if (variant === "ticks") {
    // Newest first, as the dot trail below.
    return (
      <SettlementTimelineStepper
        items={[...steps].reverse().map((step) => ({
          status: STEPPER_STATUS[step.state],
          title: step.label,
          subtitle: step.description,
        }))}
      />
    );
  }

  // Callers (e.g. deriveTimelineSteps) hand these in chronological order,
  // oldest first, that's still the correct order for the underlying data.
  // Display is reversed here so the most recent event reads at the top,
  // this is the one shared component every payment timeline (Transactions
  // and Dispute Management both reuse the same detail page) renders through.
  const displaySteps = [...steps].reverse();

  return (
    <ol className="flex flex-col">
      {displaySteps.map((step, i) => {
        const isLast = i === displaySteps.length - 1;
        return (
          <li key={step.id ?? step.label} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center">
                <span className={cn("h-2.5 w-2.5 rounded-full", DOT_CLASS[step.state])} />
              </span>
              {!isLast && <div aria-hidden="true" className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0", !isLast && "pb-5")}>
              <p className="text-sm font-semibold text-foreground/85">{step.label}</p>
              {step.description && (
                <div className="text-xs text-muted-foreground">{step.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
