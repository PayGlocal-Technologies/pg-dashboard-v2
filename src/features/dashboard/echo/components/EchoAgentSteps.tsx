"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { ECHO_PROGRESS_STEPS, ECHO_STEP_INTERVAL_MS } from "@/features/dashboard/echo/constants";
import type { AgentStep } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

/**
 * The stepped loader shown while a turn is in flight.
 *
 * COSMETIC, and deliberately so: an Echo turn is a single POST to
 * `/gcc/v1/echo/app` and the protocol carries no progress of any kind, so
 * these lines are advanced on a timer rather than reported by the server. The
 * component never claims to know which step the server is on — it holds on the
 * last line until the response lands and the parent unmounts it.
 *
 * The index lives here rather than in the session hook precisely so that
 * mounting is the reset: the parent renders this only while busy, so each turn
 * gets a fresh count with no state to clear. That also keeps `setState` inside
 * the interval callback rather than an effect body, per CLAUDE.md.
 */
export function EchoAgentSteps() {
  const active = useProgressIndex(ECHO_PROGRESS_STEPS.length);

  const steps: AgentStep[] = ECHO_PROGRESS_STEPS.map((step, index) => ({
    ...step,
    status: index < active ? "done" : index === active ? "active" : "pending",
  }));

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-2.5"
      role="status"
      aria-live="polite"
      aria-label="Working on it"
    >
      <p className="mb-2 text-[12.5px] font-medium text-foreground">
        Working on it
        <span className="ml-px inline-flex" aria-hidden>
          <span className="echo-status-ellipsis-dot">.</span>
          <span className="echo-status-ellipsis-dot">.</span>
          <span className="echo-status-ellipsis-dot">.</span>
        </span>
      </p>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {step.status === "done" ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                  <Icon name="check" className="h-2.5 w-2.5 text-white" />
                </span>
              ) : step.status === "active" ? (
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
              )}
            </span>
            <span
              className={cn(
                "text-[12.5px]",
                step.status === "done"
                  ? "text-foreground"
                  : step.status === "active"
                    ? "font-medium text-primary"
                    : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Walks forward one step per tick and stops on the last one. */
function useProgressIndex(count: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current < count - 1 ? current + 1 : current));
    }, ECHO_STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count]);

  return index;
}
