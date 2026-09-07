"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/features/dashboard/echo/types";

/**
 * The step-by-step loader shown while an assistant message is resolving —
 * "Understanding your request" → "Looking into your account" → "Preparing
 * the answer". Transient by construction: the store clears `steps` the
 * moment a reply lands (see `useEchoChat`), so this never needs a collapsed
 * "done" state of its own to manage.
 */
export function EchoAgentSteps({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) return null;

  const allDone = steps.every((s) => s.status === "done");

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-2.5"
      role="status"
      aria-live="polite"
      aria-label={allDone ? "Done" : "Working on it"}
    >
      {!allDone && (
        <p className="mb-2 text-[12.5px] font-medium text-foreground">
          Working on it
          <span className="echo-status-ellipsis ml-px inline-flex" aria-hidden>
            <span className="echo-status-ellipsis-dot">.</span>
            <span className="echo-status-ellipsis-dot">.</span>
            <span className="echo-status-ellipsis-dot">.</span>
          </span>
        </p>
      )}
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
