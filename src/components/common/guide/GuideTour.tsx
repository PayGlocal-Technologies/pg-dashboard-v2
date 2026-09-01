"use client";

/**
 * GuideTour — the step runner for a screen walkthrough.
 *
 * Controlled: it runs while `open` is true and calls `onClose` when the merchant
 * finishes, skips, or dismisses. It owns no storage and never auto-starts — the
 * launcher decides when to open it (see GuideLauncher). Each step points at an
 * element carrying a `data-guide="<id>"` attribute; the visual dim + spotlight +
 * positioning all come from <Spotlight/>.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Spotlight } from "@/components/common/guide/Spotlight";
import type { GuideStep } from "@/components/common/guide/types";

interface GuideTourProps {
  steps: GuideStep[];
  open: boolean;
  /** Fired on finish / skip / dismiss. */
  onClose: () => void;
}

export function GuideTour({ steps, open, onClose }: GuideTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Restart from the first step each time the tour is (re)opened. setState lives
  // in the rAF callback, not the effect body, per the purity lint rules.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setStepIndex(0));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function goNext() {
    if (isLast) onClose();
    else setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  /** Restart from the first step — offered on the final step's card. */
  function restart() {
    setStepIndex(0);
  }

  if (!open || !step) return null;

  return (
    // Keyed by step inside AnimatePresence(mode="wait"): advancing does NOT glide
    // the cutout across the screen — the current step's spotlight fades out, then
    // the next step's fades in at its own position. No travel between targets.
    <AnimatePresence mode="wait">
      <Spotlight
        key={stepIndex}
        target={step.target}
        side={step.side}
        align={step.align}
        onMissing={goNext}
      >
      {/* Progress dots + Skip (dots persist across steps and animate width). */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.target}
              className={
                "h-1.5 rounded-full transition-all duration-300 " +
                (i === stepIndex ? "w-5 bg-primary" : "w-2 bg-border")
              }
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-auto min-h-0 px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Step copy cross-fades on advance so the text doesn't jump-cut. */}
      <div className="relative min-h-[68px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                {step.title}
              </h3>
              {/* Amber, not red: nothing is wrong, this is simply a block the
                  merchant will be stopped at if they skip it. */}
              {step.required && (
                <span className="rounded-full bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
                  Required
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {stepIndex + 1} of {steps.length}
        </span>
        <div className="flex items-center gap-2">
          {isLast
            ? // Restart only makes sense for a multi-step tour — a single-step
              // guide (e.g. the transaction drawer) has nothing to restart.
              steps.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restart}
                  leftIcon={<Icon name="rotate-ccw" className="h-3.5 w-3.5" aria-hidden />}
                >
                  Restart
                </Button>
              )
            : stepIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" aria-hidden />}
                >
                  Back
                </Button>
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
      </Spotlight>
    </AnimatePresence>
  );
}
