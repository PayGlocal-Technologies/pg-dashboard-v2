"use client";

import type { ReactNode } from "react";

/**
 * One CTA bar, reused by all three eBRC generation steps, so the step's
 * primary/secondary actions always live in the same place regardless of
 * which step is active.
 *
 * `sticky bottom-0`, not a viewport-`fixed`/portaled bar: a fixed bar stays
 * pinned to the true bottom of the browser viewport no matter how short the
 * step's content is, which on a short table (Select IRMs with only a
 * handful of rows) left a large dead gap between the content and the bar
 * floating far below it. Sticky keeps the bar directly below the content in
 * normal flow when everything fits on screen, and only pins itself to the
 * scroll container's bottom edge once the content actually overflows — so
 * it sits high, right where the content ends, and only "detaches" when
 * scrolling makes that necessary. `-mx-6` cancels the content column's own
 * `px-6` so the bar still runs edge-to-edge across it.
 *
 * No border, no shadow, no separate surface — just the CTAs sitting in this
 * one consistent spot. A bordered/shadowed bar (even a light one) still read
 * as its own distinct "section" of chrome; this is plain placement.
 */
export function EbrcStepFooterBar({ left, right }: { left?: ReactNode; right: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-card pt-4">
      <div className="flex flex-wrap items-center gap-3">{left}</div>
      <div className="ml-auto flex items-center gap-3">{right}</div>
    </div>
  );
}
