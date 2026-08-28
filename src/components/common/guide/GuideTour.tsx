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
  function replay() {
    setStepIndex(0);
  }

  if (!open || !step) return null;

  return (
    <Spotlight
      // Keyed by step so advancing re-mounts the shell and re-measures the new
      // target from scratch (rect resets, no stale spotlight between steps).
      key={stepIndex}
      target={step.target}
      side={step.side}
      align={step.align}
      onMissing={goNext}
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
        <Button
          variant="ghost"
          size="sm"
          aria-label="Skip guide"
          onClick={onClose}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <Icon name="x" className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <h3 className="text-[15px] font-semibold leading-snug text-foreground">{step.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.description}</p>

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
              !isLast ? <Icon name="chevron-right" className="h-3.5 w-3.5" aria-hidden /> : undefined
            }
          >
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </Spotlight>
  );
}
