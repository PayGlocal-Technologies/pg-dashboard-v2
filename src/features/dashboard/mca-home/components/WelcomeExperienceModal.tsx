"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";

/** What actually changed — five real, shipped things, not filler copy. Kept
 *  here rather than inline in the JSX so the list itself, not just its
 *  wrapper markup, is the one thing to update when the next round of
 *  changes ships. */
const WHATS_NEW = [
  "A redesigned home dashboard with one-tap quick actions for invoices, accounts, and the forex calculator.",
  "A live analytics carousel — settlements, revenue trends, and your currency breakdown, all at a glance.",
  "A new eBRC section to generate and track your export realisation certificates.",
  "Echo, an AI assistant, now available right from the sidebar.",
  "Faster, redesigned invoice and transaction workflows.",
];

/** Bump when WHATS_NEW changes: a new key is a new announcement, so it shows
 *  once more to everyone who dismissed the previous one. */
const SEEN_KEY = "payglocal_mca_welcome_seen_v1";

function hasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private mode, site data off): treat as seen rather
    // than risk showing it on every single visit.
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do; see hasSeen.
  }
}

/**
 * "We've changed your experience for you" — shown once per browser per
 * version of WHATS_NEW (see SEEN_KEY), the same localStorage gate the
 * McaV2AnnouncementModal it replaces used. Any way of closing it (Start tour,
 * "later", Esc, the overlay) counts as seen: an announcement that returns on
 * every visit reads as a nag, not news.
 *
 * "Start tour" hands off to the same MCA_DASHBOARD_GUIDE_STEPS walkthrough
 * GuideLauncher's own floating button runs — one tour, reachable from two
 * places, rather than a second one authored just for this modal. The parent
 * (McaDashboardFeature) owns the GuideTour instance this triggers, since
 * GuideLauncher itself has no external/imperative way to start its tour.
 */
export function WelcomeExperienceModal({ onStartTour }: { onStartTour: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred through a zero-delay timer rather than called straight from
    // the effect body, per the no-synchronous-setState-in-effects rule —
    // also gives the dashboard's own first paint a beat before this takes
    // over the screen.
    const timer = window.setTimeout(() => {
      if (!hasSeen()) setOpen(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) markSeen();
    setOpen(next);
  }

  function handleStartTour() {
    handleOpenChange(false);
    onStartTour();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Wider + p-0/overflow-hidden: the two columns below carry their own
          padding (the left one deliberately carries none, so its image can
          bleed edge-to-edge to the panel's own rounded corners) instead of
          the Dialog's default single padded block. */}
      <DialogContent className="max-w-[min(100%-1.5rem,58rem)] overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-40 shrink-0 bg-muted/60 sm:h-auto sm:w-2/5">
            <AppImage
              src="/assets/tutorial banner2.png"
              alt=""
              fill
              sizes="(min-width: 640px) 40vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Icon name="sparkles" className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle className="mt-3 text-lg font-semibold text-foreground">
              We&apos;ve changed your experience for you
            </DialogTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Here&apos;s what&apos;s new since you were last here.
            </p>

            <ul className="mt-5 space-y-3">
              {WHATS_NEW.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Icon
                    name="check-circle"
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="text-[13.5px] leading-relaxed text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2">
              <Button type="button" variant="primary" className="w-full" onClick={handleStartTour}>
                Start tour
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                I&apos;ll do this later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
