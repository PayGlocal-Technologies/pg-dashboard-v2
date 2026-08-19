"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Animated settlement timeline. Port of pg-dashboard's
// PaymentTimelineStepper: same cascade choreography and the same timing
// constants, rebuilt on Tailwind tokens instead of styled-components and
// var(--grey-*) literals, so it inherits this app's light/dark theming.

export type SettlementStepStatus = "success" | "pending" | "error" | "inProgress" | "reversal";

export interface SettlementTimelineStep {
  status: SettlementStepStatus;
  title: string;
  subtitle?: ReactNode;
  /** Formatted timestamp line under the subtitle. Omitted for steps whose
   *  time is not meaningful yet (an upcoming or in-progress step). */
  date?: string;
  children?: ReactNode;
}

// ── Choreography ─────────────────────────────────────────────────────────────
// The connector between two steps is drawn as two independent segments — the
// half below step i ("down") and the half above step i+1 ("up") — so each can
// fill on its own clock. Chaining them down₀ → up₁ → down₁ → up₂ … with each
// segment starting partway through the previous one gives the line a single
// continuous downward sweep rather than a series of discrete hops.
const LINE_FILL_DURATION_S = 0.4;
const ICON_FADE_DURATION_S = 0.3;
const EASE_SMOOTH = [0.33, 0.88, 0.22, 1] as const;
const EASE_ICON = [0.25, 0.1, 0.25, 1] as const;
const LINE_CHAIN_OVERLAP_FR = 0.5;
const ICON_REVEAL_LEAD_FR = 0.9;
const ICON_REVEAL_MIN_UP_PROGRESS_FR = 0.1;

const segmentDelay = (segIndex: number): number =>
  segIndex * LINE_CHAIN_OVERLAP_FR * LINE_FILL_DURATION_S;
const downDelay = (index: number): number => segmentDelay(2 * index);
const upDelay = (index: number): number => segmentDelay(2 * index - 1);

/** When step `index`'s icon swaps from the pending glyph to its real one.
 *  Led slightly ahead of its incoming line segment finishing, so the icon
 *  resolves as the line arrives rather than after it. */
function revealDelay(index: number, animatedCount: number): number {
  if (index === 0) return animatedCount >= 2 ? downDelay(0) : 0;
  const upStart = upDelay(index);
  const lineEnd = upStart + LINE_FILL_DURATION_S;
  const lead = LINE_FILL_DURATION_S * ICON_REVEAL_LEAD_FR;
  const minReveal = upStart + LINE_FILL_DURATION_S * ICON_REVEAL_MIN_UP_PROGRESS_FR;
  return Math.max(minReveal, lineEnd - lead);
}

/** Leading run of steps that have actually happened — only these animate.
 *  Everything from the first pending step on is drawn in its resting state. */
function countAnimatedPrefix(items: SettlementTimelineStep[]): number {
  let n = 0;
  for (const item of items) {
    if (item.status === "pending") break;
    n += 1;
  }
  return n;
}

function lineFillClass(status: SettlementStepStatus): string {
  switch (status) {
    case "inProgress":
      return "bg-primary/40";
    case "error":
    case "reversal":
      return "bg-amber-500/50";
    default:
      return "bg-green-600/50";
  }
}

function titleClass(status: SettlementStepStatus): string {
  switch (status) {
    case "error":
      return "text-amber-600 dark:text-amber-500";
    case "reversal":
      return "text-red-600 dark:text-red-500";
    default:
      return "text-foreground";
  }
}

function StatusGlyph({ status }: { status: SettlementStepStatus }) {
  switch (status) {
    case "success":
      return <Icon name="check" className="h-4 w-4 text-green-600" strokeWidth={3} />;
    case "inProgress":
      return <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" />;
    case "error":
      return <Icon name="alert-circle" className="h-4 w-4 text-amber-600 dark:text-amber-500" />;
    case "reversal":
      return (
        <span
          aria-hidden
          className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white"
        >
          <Icon name="rotate-ccw" className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      );
    default:
      return <PendingGlyph />;
  }
}

function PendingGlyph() {
  return <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-border bg-card" />;
}

export function SettlementTimelineStepper({ items }: { items: SettlementTimelineStep[] }) {
  const reduceMotion = useReducedMotion();
  const animatedCount = useMemo(() => countAnimatedPrefix(items), [items]);

  return (
    // Keyed by animatedCount so a refetch that advances the transaction
    // remounts the list and replays the cascade from the top, rather than
    // leaving the newly-completed steps to pop in without animation.
    <ul key={animatedCount} className="list-none">
      {items.map((item, index) => {
        const isAnimated = index < animatedCount;
        const hasUpSegment = isAnimated && index > 0;
        const hasDownSegment = isAnimated && index < items.length - 1;
        const showLineUp = index > 0;
        const showLineDown = index < items.length - 1;

        const revealTransition: Transition = {
          type: "tween",
          duration: reduceMotion ? 0 : ICON_FADE_DURATION_S,
          ease: EASE_ICON,
          delay: reduceMotion ? 0 : revealDelay(index, animatedCount),
        };

        const lineTransition = (delay: number): Transition => ({
          duration: reduceMotion ? 0 : LINE_FILL_DURATION_S,
          ease: EASE_SMOOTH,
          delay: reduceMotion ? 0 : delay,
        });

        const upFill = lineFillClass(items[index - 1]?.status ?? "success");
        const downFill = lineFillClass(item.status);

        return (
          <li
            key={`${item.title}-${index}`}
            className="grid grid-cols-[1.25rem_1fr] items-stretch gap-3"
          >
            {/* Rail. The dot sits at the vertical centre of the title's first
                line (top-0 h-5 box), and the two connector halves are
                measured from that same centre, so they meet the dot exactly
                whatever height the step's body grows to. */}
            <div className="relative w-5 justify-self-center">
              {showLineUp && (
                <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-border" />
                  <motion.div
                    className={cn("absolute inset-0 origin-top rounded-full", upFill)}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: hasUpSegment ? 1 : 0 }}
                    transition={lineTransition(hasUpSegment ? upDelay(index) : 0)}
                  />
                </div>
              )}

              <div className="absolute left-1/2 top-0 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center">
                {isAnimated ? (
                  <>
                    {/* The pending glyph fades out underneath the real one
                        fading in, so the swap reads as one state resolving
                        rather than two separate elements. */}
                    <motion.span
                      className="absolute flex items-center justify-center"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={revealTransition}
                    >
                      <PendingGlyph />
                    </motion.span>
                    <motion.span
                      className="flex items-center justify-center"
                      initial={reduceMotion ? false : { scale: 0.94, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={revealTransition}
                    >
                      <StatusGlyph status={item.status} />
                    </motion.span>
                  </>
                ) : (
                  <PendingGlyph />
                )}
              </div>

              {showLineDown && (
                <div className="absolute bottom-0 left-1/2 top-2.5 w-px -translate-x-1/2 overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-border" />
                  <motion.div
                    className={cn("absolute inset-0 origin-top rounded-full", downFill)}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: hasDownSegment ? 1 : 0 }}
                    transition={lineTransition(hasDownSegment ? downDelay(index) : 0)}
                  />
                </div>
              )}
            </div>

            <div className={cn("min-w-0", index < items.length - 1 && "pb-5")}>
              <motion.p
                className="text-[13px] font-medium leading-5"
                initial={{ opacity: isAnimated ? 0.55 : 1 }}
                animate={{ opacity: 1 }}
                transition={revealTransition}
              >
                <span className={isAnimated ? titleClass(item.status) : "text-muted-foreground"}>
                  {item.title}
                </span>
              </motion.p>

              {item.subtitle ? (
                <div
                  className={cn(
                    "mt-0.5 text-[12px] leading-snug",
                    item.status === "reversal"
                      ? "text-red-600 dark:text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {item.subtitle}
                </div>
              ) : null}

              {item.date ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.date}</p>
              ) : null}

              {item.children}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
