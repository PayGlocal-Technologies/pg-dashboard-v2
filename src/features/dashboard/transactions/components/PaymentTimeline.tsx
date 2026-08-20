import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineStepState = "complete" | "current" | "pending" | "danger";

export interface TimelineStep {
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

export function PaymentTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center">
                <span className={cn("h-2.5 w-2.5 rounded-full", DOT_CLASS[step.state])} />
              </span>
              {!isLast && <div aria-hidden="true" className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0", !isLast && "pb-5")}>
              <p className="text-sm font-semibold text-foreground/85">{step.label}</p>
              {step.description && <div className="text-xs text-muted-foreground">{step.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
