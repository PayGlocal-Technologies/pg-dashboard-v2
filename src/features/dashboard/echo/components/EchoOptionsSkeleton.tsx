"use client";

import { Shimmer } from "@/components/ui";

/**
 * Placeholder tiles for the opening menu, shown while the handshake is in
 * flight.
 *
 * Deliberately the same geometry as the real main-menu grid in
 * `EchoListOptions` (same radius, same tile shape, same 2-per-row layout),
 * because the point is that nothing moves when the server answers: the tiles
 * fill in rather than the screen re-laying out. Showing the hardcoded prompt
 * cards here instead was what caused the visible swap — four suggestions
 * replaced by four different menu rows the moment the response landed.
 *
 * Four tiles because that is what the main menu has today (Transactions,
 * Settlements, Raise a Query, Accounts). Being wrong by one costs a tile of
 * slack; being wrong about the tile *shape* is what would show.
 */
export function EchoOptionsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex min-h-23 flex-col items-start gap-1.5 rounded-2xl border border-border/70 bg-card px-2.5 py-3 shadow-sm"
        >
          <Shimmer className="h-7 w-7 shrink-0" rounded="full" />
          <Shimmer className="h-2.5 w-full max-w-16" rounded="md" />
          <Shimmer className="h-2 w-full" rounded="md" />
        </div>
      ))}
      <span className="sr-only">Loading Echo&apos;s menu</span>
    </div>
  );
}
