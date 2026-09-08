"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { dashboardOrigin } from "@/constants/environment";

/** Shown once ever, per browser — there's no reliable way to tell "just
 *  logged in" apart from "already-logged-in page refresh" in this app's
 *  current auth state (see the store, no session-scoped flag exists), so a
 *  plain localStorage flag is the honest version of "once after login".
 *  Mirrors the window-guarded try/catch pattern `guide/storage.ts` uses for
 *  the same kind of "seen it" flag. */
const SEEN_KEY = "payglocal_mca_v2_announcement_seen";

function hasSeenAnnouncement(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markAnnouncementSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode / quota — degrades to showing again next time, which is
       the safe direction to fail in for a one-time announcement. */
  }
}

/** A short beat after mount, so this doesn't compete with the dashboard's own
 *  first paint for attention — same spirit as FeedbackSheet's SHOW_DELAY_MS,
 *  just shorter, since this is the first thing a merchant should notice
 *  rather than something that can wait. */
const SHOW_DELAY_MS = 500;

/**
 * "We've upgraded Multi-Currency Accounts" — a one-time, full-attention
 * announcement shown after login, not tucked into a banner a merchant could
 * easily miss. Mounted once in the dashboard layout, beside `FeedbackSheet`.
 *
 * Only for merchants who actually have MCA (PACB) access — an announcement
 * about MCA means nothing to a Payments-only merchant, so this stays quiet
 * for them the same way the header's own product tabs do.
 *
 * The secondary path ("Switch to old experience") is a real way out, not a
 * dead end dressed up as one: it's a straight navigation to pg-dashboard, via
 * the app's own `dashboardOrigin()` so the per-environment host rules live in
 * one place (see `src/constants/environment.ts`).
 * Either button — or closing the dialog outright — marks this seen, since a
 * merchant who has looked at the announcement once doesn't need it again
 * regardless of which way they went.
 */
export function McaV2AnnouncementModal() {
  const paCbMids = useApp((s) => s.paCbMids);
  const hasMca = paCbMids.length > 0;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasMca || hasSeenAnnouncement()) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasMca]);

  const dismiss = () => {
    markAnnouncementSeen();
    setOpen(false);
  };

  const goToOldExperience = () => {
    markAnnouncementSeen();
    // A different app on a different origin (pg-dashboard v1), so this is a
    // real document navigation, not a Next route — router.push() cannot
    // reach it. The rule only sees the template literal, not the origin.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${dashboardOrigin()}/app`;
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      {/* p-0 + overflow-hidden: content gets its own padded wrapper below, so
          the illustration strip at the bottom can bleed edge-to-edge and get
          cropped by this panel's own rounded corners, the way a screenshot
          peeking over a frame's edge would. */}
      <DialogContent className="max-w-[min(100%-1.5rem,30rem)] overflow-hidden p-0">
        {/* The gradient beam: ONE continuous two-stop wash spanning the whole
            panel, header down through the illustration — not a three-stop
            gradient that flattens to plain background halfway down. That
            mid-stop was the actual bug: it left the illustration's own fade
            blending into flat white instead of into blue, which is what read
            as a hard, broken-looking seam in the previous version. */}
        <div className="relative isolate overflow-hidden bg-gradient-to-b from-primary/20 to-background pt-9">
          {/* Two blurred sparkle glyphs standing in for the reference's glow
              shapes — built from the existing icon, not a new asset, per this
              app's icon-registry-only rule for decorative graphics. Purely
              decorative: aria-hidden, and inert to pointer/selection. */}
          <Icon
            name="sparkles"
            aria-hidden
            className="pointer-events-none absolute -right-8 top-2 h-24 w-24 select-none text-primary/35 blur-2xl"
          />
          <Icon
            name="sparkles"
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-8 h-28 w-28 select-none text-primary/30 blur-2xl"
          />

          <div className="relative px-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Icon name="sparkles" className="h-6 w-6 text-primary" />
            </span>

            <DialogTitle className="mt-4 text-xl font-semibold text-foreground">
              Multi-Currency Accounts just got a new look
            </DialogTitle>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              We&apos;ve rebuilt this experience to be faster and easier to use. Everything you rely
              on is still here, just easier to find.
            </p>

            <div className="mt-6 space-y-2">
              <Button type="button" variant="primary" className="w-full" onClick={dismiss}>
                Start with the new experience
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={goToOldExperience}>
                Switch to old experience
              </Button>
            </div>
          </div>

          {/* The illustration: a plain CSS mock of the new dashboard rather
              than an image (same icon-registry rule), widened past the
              panel's own edge so its sides crop off instead of stopping
              short. mask-image fades only its very top sliver into the beam
              above — tight enough (10%, not 45%) that the card's own chrome
              and content stay fully visible instead of half-erased along
              with the seam. Every tint in it is a shade of the app's own
              primary blue, matching the beam rather than introducing a
              second, unrelated hue. */}
          <div
            aria-hidden
            className="relative mt-7 h-36 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_10%)] mask-[linear-gradient(to_bottom,transparent,black_10%)]"
          >
            <div className="absolute left-1/2 top-0 w-[125%] -translate-x-1/2 rounded-t-2xl border border-border/60 bg-card shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
              </div>
              <div className="grid grid-cols-3 gap-2.5 p-4">
                <div className="col-span-2 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/5" />
                <div className="h-16 rounded-lg bg-gradient-to-br from-primary/50 to-primary/15" />
                <div className="col-span-3 h-2 rounded-full bg-muted" />
                <div className="col-span-2 h-2 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
