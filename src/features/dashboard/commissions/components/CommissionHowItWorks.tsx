"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconButton, Separator, StatusBadge, useBreakpoint } from "@/components/ui";
import { Icon } from "@/components/icon";
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

/** One soft deceleration for every part of the open and close, so the
 *  table, the space the panel takes and the panel's own fade all move as one. */
const EASE = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.36;

/** Panel width beside the table, plus the 1rem gap to it. */
const SIDE_WIDTH = "23rem";

/**
 * "How commissions work": an in-page column, not a modal or drawer. No
 * overlay, no scroll lock, nothing dimmed. Beside the table from xl, above
 * it below that; it takes no space while closed.
 *
 * The space it occupies is what animates (its width beside the table, its
 * height above it), so the table eases aside and back instead of snapping
 * to its new size. The panel inside keeps a fixed width throughout, so its
 * text never rewraps mid-animation, and it fades and slides in just behind
 * the space opening up. The gap to the table lives inside that space, so
 * nothing jumps when it finishes closing.
 */
export function CommissionHowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const { isAbove } = useBreakpoint();
  const beside = isAbove("xl");
  const duration = reduceMotion ? 0 : DURATION;

  const collapsed = beside ? { width: 0 } : { height: 0 };
  const expanded = beside ? { width: SIDE_WIDTH } : { height: "auto" };
  const hiddenPanel = beside ? { opacity: 0, x: 16 } : { opacity: 0, y: 8 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key={beside ? "beside" : "above"}
          initial={collapsed}
          animate={expanded}
          exit={collapsed}
          transition={{ duration, ease: EASE }}
          className="order-first shrink-0 overflow-hidden xl:sticky xl:top-4 xl:order-none"
        >
          <div className={beside ? "w-[23rem] pl-4" : "pb-4"}>
            <motion.aside
              id={HOW_IT_WORKS_ID}
              aria-label="How commissions work"
              initial={hiddenPanel}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={hiddenPanel}
              transition={{
                duration: reduceMotion ? 0 : DURATION * 0.8,
                ease: EASE,
                // Open: follow the space a beat behind. Close: fade first.
                delay: reduceMotion ? 0 : 0.06,
              }}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs"
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
