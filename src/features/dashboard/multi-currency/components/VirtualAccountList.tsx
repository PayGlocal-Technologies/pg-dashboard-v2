"use client";

import { useEffect, useRef, useState, type UIEvent } from "react";
import { EmptyState } from "@/components/ui";
import { ICONS } from "@/components/icon/registry";
import { cn } from "@/lib/utils";
import { VirtualAccountCard } from "@/features/dashboard/multi-currency/components/VirtualAccountCard";
import { VirtualAccountCardSkeleton } from "@/features/dashboard/multi-currency/components/VirtualAccountCardSkeleton";
import { SKELETON_CARD_COUNT } from "@/features/dashboard/multi-currency/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

// How close to either end of the scrollable width counts as "there" — a few
// px of slack for sub-pixel scroll positions rather than requiring an exact 0.
const END_OF_SCROLL_THRESHOLD_PX = 4;
const START_OF_SCROLL_THRESHOLD_PX = 4;

interface VirtualAccountListProps {
  accounts: VirtualAccount[];
  isLoading?: boolean;
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
  /** id of the account whose details section is expanded, or null if none is. */
  expandedAccountId: string | null;
  onToggleExpand: (account: VirtualAccount) => void;
}

/**
 * Horizontally scrolling row of virtual account cards.
 *
 * `overflow-x-auto` + `shrink-0` cards keeps everything on one line at any
 * viewport width, and scroll snapping makes the swipe land on a card edge.
 * Adding more supported countries needs no layout change — the row just gets
 * longer.
 */
export function VirtualAccountList({
  accounts,
  isLoading = false,
  onCopy,
  onShare,
  expandedAccountId,
  onToggleExpand,
}: VirtualAccountListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Hidden once there's nothing left to scroll to — either the list never
  // overflowed in the first place, or the user has scrolled to the end.
  const [showEndFade, setShowEndFade] = useState(true);
  // Hidden at the initial scroll position; appears once the user has
  // actually scrolled right, meaning there are cards behind them again.
  const [showStartFade, setShowStartFade] = useState(false);

  const updateFades = (el: HTMLDivElement | null) => {
    if (!el) return;
    const atStart = el.scrollLeft <= START_OF_SCROLL_THRESHOLD_PX;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - END_OF_SCROLL_THRESHOLD_PX;
    setShowStartFade(!atStart);
    setShowEndFade(!atEnd);
  };

  // Re-check on mount and whenever the account count changes (e.g. once
  // real data replaces the mock list) — a short list may not overflow at all.
  useEffect(() => {
    updateFades(scrollRef.current);
  }, [accounts.length]);

  if (isLoading) {
    return (
      // p-1 (4px, uniform): a deliberately subtle inset — just enough that
      // overflow-x-auto (which per the CSS overflow spec also clips the
      // vertical axis once the horizontal one isn't "visible") doesn't clip
      // a card's rounded corners, shadow, or the active ring-2, without
      // visibly indenting the carousel from the page's other content.
      <div className="scrollbar-none flex gap-4 overflow-hidden p-1" aria-busy>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
          <VirtualAccountCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={ICONS.wallet}
        title="No virtual accounts yet"
        description="Once your multi-currency accounts are activated, the receiving details for each supported country will appear here."
      />
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={(e: UIEvent<HTMLDivElement>) => updateFades(e.currentTarget)}
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-1"
        role="list"
        aria-label="Virtual receiving accounts"
      >
        {accounts.map((account, index) => (
          <div
            key={account.id}
            role="listitem"
            className={cn("snap-start", index === 0 && "ml-2")}
          >
            <VirtualAccountCard
              account={account}
              onCopy={onCopy}
              onShare={onShare}
              isExpanded={account.id === expandedAccountId}
              onToggleExpand={onToggleExpand}
            />
          </div>
        ))}
      </div>

      {/* Leading scroll affordance — the mirror image of the trailing one
          below: fixed over the left edge, hidden at the initial scroll
          position, and only fades in once the user has actually scrolled
          right (so there are cards behind them to hint at). Same sibling
          positioning and pointer-events-none reasoning as the trailing
          gradient. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent",
          "transition-opacity duration-200",
          showStartFade ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Trailing scroll affordance: a fixed gradient over the right edge,
          hinting more cards sit off-screen. It's a sibling of the scroll
          container (not a child), so it stays put while cards scroll beneath
          it. pointer-events-none keeps it from ever intercepting clicks or
          blocking the scroll gesture. Fades out once there's nothing left to
          scroll to. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background",
          "transition-opacity duration-200",
          showEndFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
