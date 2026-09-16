"use client";

import { Shimmer } from "@/components/ui";

/**
 * Placeholder rows for the opening menu, shown while the handshake is in
 * flight.
 *
 * Deliberately the same geometry as a real option row in `EchoListOptions`
 * (same radius, same height, same gaps), because the point is that nothing
 * moves when the server answers: the rows fill in rather than the screen
 * re-laying out. Showing the hardcoded prompt cards here instead was what
 * caused the visible swap — four suggestions replaced by four different menu
 * rows the moment the response landed.
 *
 * Four rows because that is what the main menu has today. Being wrong by one
 * costs a row of settle; being wrong about the row *shape* is what would show.
 */
export function EchoOptionsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-[42px] items-center gap-2.5 rounded-xl border border-border/70 bg-card/80 px-3.5 shadow-sm"
        >
          <Shimmer className="h-4 w-4 shrink-0" rounded="md" />
          <Shimmer className="h-2.5 w-32 max-w-[55%]" rounded="md" />
        </div>
      ))}
      <span className="sr-only">Loading Echo&apos;s menu</span>
    </div>
  );
}
