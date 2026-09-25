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
 * scrolling makes that necessary.
 *
 * A real card (rounded, bordered, its own side padding) — a flat, unbordered
 * strip flush with the content column's own edges read as a stray sliver of
 * background rather than a distinct control, especially over the page's own
 * background wash.
 */
export function EbrcStepFooterBar({ left, right }: { left?: ReactNode; right: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-6 py-3.5">
      <div className="flex flex-wrap items-center gap-3">{left}</div>
      <div className="ml-auto flex items-center gap-3">{right}</div>
    </div>
  );
}
