"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SectionLabel } from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { cn } from "@/lib/utils";

export type DisputeFormStepState = "complete" | "current" | "locked";

export interface DisputeFormStep {
  label: string;
  description: string;
  state: DisputeFormStepState;
}

/** Given each step's own completion flag (in order), the first incomplete
 * one is "current" (unlocked, actionable), everything before it is
 * "complete", everything after it is "locked" (not reachable yet). */
export function buildDisputeFormStepStates(doneFlags: boolean[]): DisputeFormStepState[] {
  const states: DisputeFormStepState[] = [];
  let seenIncomplete = false;
  for (const done of doneFlags) {
    if (seenIncomplete) {
      states.push("locked");
    } else if (done) {
      states.push("complete");
    } else {
      states.push("current");
      seenIncomplete = true;
    }
  }
  return states;
}

function StepMarker({ state }: { state: DisputeFormStepState }) {
  return (
    <span
      className={cn(
        "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        state === "complete" && "border-emerald-500 bg-emerald-500",
        state === "current" && "border-primary bg-card",
        state === "locked" && "border-border bg-muted"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "complete" ? (
          <motion.span
            key="complete"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            <Icon name="check" size={13} strokeWidth={3} className="text-white" aria-hidden />
          </motion.span>
        ) : state === "locked" ? (
          <motion.span
            key="locked"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Icon name="lock" size={11} className="text-muted-foreground/60" aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            key="current"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="block h-2 w-2 rounded-full bg-primary"
          />
        )}
      </AnimatePresence>
    </span>
  );
}

interface DisputeFormTimelineCardProps {
  steps: DisputeFormStep[];
}

/** Live progress tracker for the Contest/Accept-partially form (see
 * DisputeRespondForm), a vertical-line timeline where each step ticks the
 * instant its matching form field/action is completed, steps beyond the
 * current one show locked until reached. This tracks the form's own
 * progress, not the dispute's overall lifecycle (see PaymentTimeline, a
 * different card on the main dispute detail page). */
export function DisputeFormTimelineCard({ steps }: DisputeFormTimelineCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Timeline</SectionLabel>
      <Card className="gap-0 p-5">
        <ol className="flex flex-col">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <li key={step.label} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <StepMarker state={step.state} />
                  {!isLast && (
                    <motion.div
                      aria-hidden="true"
                      className="my-1 w-px flex-1"
                      animate={{
                        backgroundColor:
                          step.state === "complete"
                            ? "var(--color-emerald-500, #10b981)"
                            : "var(--border)",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
                <div className={cn("min-w-0", !isLast && "pb-5")}>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      step.state === "locked" ? "text-muted-foreground/60" : "text-foreground/85"
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      step.state === "locked" ? "text-muted-foreground/50" : "text-muted-foreground"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
