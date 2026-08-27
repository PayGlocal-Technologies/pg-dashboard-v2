"use client";

/**
 * GuideTour — reusable, screen-by-screen onboarding coach-marks.
 *
 * Give it an ordered list of `steps` (each pointing at an element carrying a
 * `data-guide="<id>"` attribute) and a persistent `storageKey`. On first visit
 * it dims the screen, spotlights the current target, and floats a card with the
 * step copy plus Back / Next / Done controls — then never shows again once the
 * merchant finishes or dismisses it.
 *
 * Positioning rides on the flux Popover (Radix under the hood) via an invisible
 * anchor pinned to the target's bounding rect, so collision-flipping is free.
 * The dim + spotlight is a single box-shadow layer rendered through a portal.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Button, IconButton } from "@/components/ui";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { isGuideCompleted, markGuideCompleted } from "@/components/common/guide/storage";
import type { GuideStep } from "@/components/common/guide/types";

interface GuideTourProps {
  steps: GuideStep[];
  /** localStorage id (bare, un-prefixed). Once completed the tour stays hidden. */
  storageKey: string;
  /** Start automatically on first visit. Default true. */
  autoStart?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Padding (px) of the spotlight cutout around the highlighted element. */
const SPOTLIGHT_PAD = 8;

/** How long to wait for a not-yet-rendered target before skipping the step.
 *  ~6s (40 × 150ms) covers a screen still fetching its data on first paint. */
const MAX_TARGET_ATTEMPTS = 40;
const TARGET_RETRY_MS = 150;

export function GuideTour({ steps, storageKey, autoStart = true }: GuideTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Enable on the client, after paint, so targets have mounted and we avoid a
  // hydration mismatch (server always renders nothing). setState lives inside
  // the rAF callback, not the effect body — satisfies the purity lint rules.
  useEffect(() => {
    if (!autoStart || steps.length === 0) return;
    const raf = requestAnimationFrame(() => {
      if (!isGuideCompleted(storageKey)) setActive(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [autoStart, steps.length, storageKey]);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function finish() {
    markGuideCompleted(storageKey);
    setActive(false);
  }

  function goNext() {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  /** Restart from the first step — offered on the final step's card. */
  function replay() {
    setStepIndex(0);
  }

  // Measure the active target, keep it in view, and track scroll/resize.
  useEffect(() => {
    if (!active || !step) return;

    let raf = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let measure: (() => void) | undefined;
    let attempts = 0;

    // A target id can appear more than once (mobile + desktop variants toggled
    // by `display:none`, or one per table row). Pick the first that is actually
    // rendered so the spotlight never lands on a zero-size ghost.
    const findVisible = () =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${step.target}"]`)).find(
        (c) => c.offsetParent !== null && c.getBoundingClientRect().width > 0,
      ) ?? null;

    const attach = () => {
      const el = findVisible();

      // Target not on the DOM yet — the screen may still be fetching its data.
      // Poll a bounded number of times before giving up and skipping the step,
      // so an async-loaded target (e.g. a table row) isn't silently missed.
      if (!el) {
        attempts += 1;
        if (attempts > MAX_TARGET_ATTEMPTS) {
          raf = requestAnimationFrame(() => goNext());
          return;
        }
        retry = setTimeout(attach, TARGET_RETRY_MS);
        return;
      }

      measure = () => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      };

      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      raf = requestAnimationFrame(measure);
      settle = setTimeout(measure, 340); // remeasure after smooth scroll settles
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
    };

    attach();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      clearTimeout(retry);
      if (measure) {
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
      }
    };
    // goNext is stable enough for our purposes; re-run only on step/active change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, step]);

  // Hold everything back until the target has been measured — no card should
  // flash on screen before the spotlight can point at anything.
  if (!active || !step || !rect || typeof document === "undefined") return null;

  const spot: Rect = {
    top: rect.top - SPOTLIGHT_PAD,
    left: rect.left - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {/* Dim + spotlight cutout via a single oversized box-shadow. */}
      {spot && (
        <motion.div
          initial={false}
          animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute rounded-xl ring-2 ring-primary/70"
          style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)" }}
        />
      )}

      {/* Card, positioned by Radix relative to an invisible anchor at the rect. */}
      <Popover open onOpenChange={(o) => !o && finish()}>
        {spot && (
          <PopoverAnchor asChild>
            <div
              className="pointer-events-none fixed"
              style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
              aria-hidden
            />
          </PopoverAnchor>
        )}
        <PopoverContent
          side={step.side ?? "bottom"}
          align={step.align ?? "center"}
          sideOffset={14}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="pointer-events-auto z-[121] w-[320px] rounded-2xl border border-border bg-background p-4 shadow-2xl"
        >
          {/* Progress dots + close */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <span
                  key={s.target}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (i === stepIndex ? "w-5 bg-primary" : "w-2 bg-border")
                  }
                />
              ))}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Skip guide"
              onClick={finish}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Icon name="x" className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>

          <h3 className="text-[15px] font-semibold leading-snug text-foreground">{step.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {stepIndex + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {isLast ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={replay}
                  leftIcon={<Icon name="rotate-ccw" className="h-3.5 w-3.5" aria-hidden />}
                >
                  Replay
                </Button>
              ) : (
                stepIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" aria-hidden />}
                  >
                    Back
                  </Button>
                )
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={goNext}
                rightIcon={
                  !isLast ? (
                    <Icon name="chevron-right" className="h-3.5 w-3.5" aria-hidden />
                  ) : undefined
                }
              >
                {isLast ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>,
    document.body,
  );
}
