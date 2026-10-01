"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconButton, Separator, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { commissionStatusMeta } from "@/features/dashboard/commissions/columns";
import type { CommissionStatus } from "@/features/dashboard/commissions/types";

export const HOW_IT_WORKS_ID = "commission-how-it-works";

const STEPS = [
  {
    title: "Eligible transactions",
    body: "Eligible transactions generate commission based on your agreed referral pricing.",
  },
  {
    title: "Commission processing",
    body: "At the end of each transaction period, your commission is calculated and processed.",
  },
  {
    title: "Commission released",
    body: "Once processing is complete, your commission is released according to your payout cycle.",
  },
  {
    title: "Statement available",
    body: "Download your commission statement once the payout is released.",
  },
] as const;

const STATUSES: { status: CommissionStatus; body: string }[] = [
  { status: "IN_PROGRESS", body: "Current period is still ongoing." },
  { status: "PROCESSING", body: "Commission is being calculated." },
  { status: "RELEASED", body: "Commission has been processed and the statement is available." },
];

function CommissionHowItWorksHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">How commissions work</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Understand how your commission moves from eligible transactions to payout.
        </p>
      </div>
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Close"
        onClick={onClose}
        className="-mt-1 -mr-1 h-7 w-7 min-h-0 min-w-0 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Icon name="x" size={15} aria-hidden />
      </IconButton>
    </div>
  );
}

/** Four steps, top to bottom, joined by a line down the left through the
 *  number markers. */
function CommissionProcessSteps() {
  return (
    <ol className="mt-5 space-y-5">
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative flex gap-3">
          {/* A line down from this marker to the next one. */}
          {i < STEPS.length - 1 && (
            <span aria-hidden className="absolute top-7 bottom-[-1.25rem] left-3 w-px bg-border" />
          )}
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold tabular-nums text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The table's own status chips (commissionStatusMeta), each with what it
 *  means: no new colours or styles. */
function CommissionStatuses() {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground">Commission statuses</h3>
      <div className="mt-3 space-y-3">
        {STATUSES.map(({ status, body }) => {
          const { label, variant, trailIcon } = commissionStatusMeta(status);
          return (
            <div key={status}>
              <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "How commissions work": an in-page column, not a modal or drawer. No
 * overlay, no scroll lock, nothing dimmed. The page lays it out (beside the
 * table on wide screens, above it otherwise); it takes no space while
 * closed, and fades in with a short slide from the right (~200ms ease-out).
 */
export function CommissionHowItWorks({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.2, ease: "easeOut" } as const;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="how-it-works"
          id={HOW_IT_WORKS_ID}
          aria-label="How commissions work"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={transition}
          className={cn("rounded-2xl border border-border bg-card p-5 shadow-xs", className)}
        >
          <CommissionHowItWorksHeader onClose={onClose} />
          <CommissionProcessSteps />
          <Separator className="my-5" />
          <CommissionStatuses />
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Need help with your commission?</span>{" "}
            Contact your PayGlocal account manager or support.
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
