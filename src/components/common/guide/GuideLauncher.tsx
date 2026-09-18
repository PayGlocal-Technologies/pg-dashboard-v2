"use client";

/**
 * GuideLauncher — the entry point for a screen's walkthrough.
 *
 * Renders a persistent floating button (bottom-right) on every screen it's
 * placed on. The tour no longer starts on its own: the merchant taps the button
 * to run it, and can replay it any time.
 *
 * On the main dashboard only (`highlightOnFirstVisit`), the button is spotlighted
 * once on first visit with a short "take a tour" prompt. Starting the tour or
 * dismissing that prompt (the ✕) marks it seen so it never highlights again —
 * the button itself stays put regardless.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Spotlight } from "@/components/common/guide/Spotlight";
import { GuideTour } from "@/components/common/guide/GuideTour";
import { isGuideCompleted, markGuideCompleted } from "@/components/common/guide/storage";
import type { GuideStep } from "@/components/common/guide/types";

interface GuideLauncherProps {
  steps: GuideStep[];
  /** localStorage id (bare, un-prefixed) tracking whether the first-visit
   *  highlight has been seen. */
  storageKey: string;
  /** Spotlight the button once on first visit — only the main dashboard. */
  highlightOnFirstVisit?: boolean;
}

export function GuideLauncher({
  steps,
  storageKey,
  highlightOnFirstVisit = false,
}: GuideLauncherProps) {
  const [running, setRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Decide the first-visit highlight on the client, after paint (so the button
  // has mounted for the spotlight to measure). setState is in the rAF callback,
  // not the effect body, per the purity lint rules.
  useEffect(() => {
    if (!highlightOnFirstVisit || steps.length === 0) return;
    const raf = requestAnimationFrame(() => {
      if (!isGuideCompleted(storageKey)) setShowIntro(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightOnFirstVisit, steps.length, storageKey]);

  function startTour() {
    markGuideCompleted(storageKey);
    setShowIntro(false);
    setRunning(true);
  }

  function dismissIntro() {
    markGuideCompleted(storageKey);
    setShowIntro(false);
  }

  if (steps.length === 0) return null;

  return (
    <>
      {/* Persistent launcher — below the tour overlay (z-120) but above app
          chrome. During the first-visit highlight the dim leaves a hole here,
          so this button shows through and stays clickable. */}
      <Button
        type="button"
        variant="primary"
        size="sm"
        data-guide="guide-launcher"
        aria-label="Open the guided tour for this screen"
        onClick={startTour}
        leftIcon={<Icon name="sparkles" className="h-4 w-4" aria-hidden />}
        className="fixed bottom-6 right-6 z-[60] rounded-full shadow-lg"
      >
        Guide
      </Button>

      {/* First-visit highlight on the button itself — a breathing halo (pulse)
          around it so it doesn't get overlooked in the corner. */}
      {showIntro && !running && (
        <Spotlight target="guide-launcher" side="top" align="end" pulse>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="sparkles" className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-[15px] font-semibold leading-snug text-foreground">
              Take a quick tour
            </h3>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            New to this dashboard? We&apos;ll point out the key things in a few seconds. You can
            reopen it any time from this button.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissIntro}
              className="h-auto min-h-0 px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startTour}
              rightIcon={<Icon name="arrow-right" className="h-3.5 w-3.5" aria-hidden />}
            >
              Start tour
            </Button>
          </div>
        </Spotlight>
      )}

      <GuideTour steps={steps} open={running} onClose={() => setRunning(false)} />
    </>
  );
}
