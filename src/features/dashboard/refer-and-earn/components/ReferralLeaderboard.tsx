"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Card, Heading, Separator, Text } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { buildLeaderboardView } from "@/features/dashboard/refer-and-earn/helpers";
import type {
  LeaderboardEntry,
  ReferralStandings,
} from "@/features/dashboard/refer-and-earn/types";

/**
 * Podium treatments: gold, silver, bronze. Hue-matched the way StatusBadge's
 * variants are — a tinted fill with an inset ring and a dark-mode counterpart —
 * rather than literal metallic gradients.
 */
const MEDAL_CLASS: Record<number, string> = {
  1: "bg-amber-400/30 text-amber-900 ring-amber-500/40 dark:bg-amber-400/25 dark:text-amber-100 dark:ring-amber-300/45",
  2: "bg-slate-300/40 text-slate-700 ring-slate-400/40 dark:bg-slate-300/20 dark:text-slate-100 dark:ring-slate-300/40",
  3: "bg-orange-500/25 text-orange-900 ring-orange-600/35 dark:bg-orange-500/25 dark:text-orange-100 dark:ring-orange-300/40",
};

/** How many rows the scroll viewport shows at once. */
const VISIBLE_ROWS = 4;

/**
 * One row's height, composed from the same tokens the row itself uses rather
 * than measured in pixels: `py-2.5` top and bottom (0.625rem each) around a
 * two-line stack of `text-sm` (1.25rem) over `text-xs` (1rem). Kept in rem so
 * the viewport tracks the root font size instead of pinning to a device pixel
 * count, and stated once so the row and the viewport cannot drift apart.
 */
const ROW_HEIGHT = "3.5rem";

/** The dashboard's positive-text treatment, as used on the MCA stat cards. */
const POSITIVE_TEXT = "text-emerald-600 dark:text-emerald-400";

/**
 * Podium ranks get a filled medal; every other rank — including the merchant's
 * own, unless they are actually on the podium — gets a neutral outlined circle,
 * so the medals stay meaningful.
 */
function RankIndicator({ rank }: { rank: number }) {
  const medal = MEDAL_CLASS[rank];

  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums ring-1 ring-inset",
        medal ?? "bg-transparent font-semibold text-muted-foreground ring-border",
        medal && "font-bold"
      )}
    >
      {rank}
    </span>
  );
}

/**
 * [ rank ] [ name / referral count ] ……… [ amount ]
 *
 * One rhythm for every row on the board: the name and its referral count are a
 * tight stack, and the amount is centred against that stack rather than against
 * either line of it.
 */
function LeaderboardRow({
  entry,
  isCurrentMerchant = false,
}: {
  entry: LeaderboardEntry;
  isCurrentMerchant?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2.5",
        // The merchant's own row is washed with the brand surface so they can
        // find themselves at a glance, without outweighing the podium above it.
        isCurrentMerchant && "bg-primary/15"
      )}
    >
      <RankIndicator rank={entry.rank} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Text size="sm" weight="medium" truncate>
          {entry.displayName}
        </Text>
        <Text size="xs" color="subtle" truncate>
          {entry.referralCount} {entry.referralCount === 1 ? "Referral" : "Referrals"}
        </Text>
      </div>

      <Text size="sm" weight="semibold" className="shrink-0 tabular-nums">
        {formatCurrency(entry.amount, entry.currency, "en-US")}
      </Text>
    </div>
  );
}

/**
 * The gap to the top of the board, in referrals — the figure the merchant can
 * act on. Flanked by up-arrows and set in the dashboard's positive treatment, so
 * it reads as progress rather than as a shortfall.
 */
function ProgressMessage({ toReach }: { toReach: number }) {
  if (toReach <= 0) {
    return (
      <Text size="sm" className={cn("text-center", POSITIVE_TEXT)}>
        You&rsquo;re #1 on the leaderboard
      </Text>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-1.5", POSITIVE_TEXT)}>
      <Icon name="arrow-up" size={14} strokeWidth={2.25} />
      <Text size="sm" className="text-inherit">
        {toReach} referral{toReach === 1 ? "" : "s"} to reach #1
      </Text>
      <Icon name="arrow-up" size={14} strokeWidth={2.25} />
    </div>
  );
}

interface ReferralLeaderboardProps {
  standings: ReferralStandings;
  /**
   * The merchant's earned total and completed-referral count, from the same
   * summary the analytics row uses, so their row can never disagree with the
   * figures above it.
   */
  currentEarned: number;
  currentReferralCount: number;
  currency: string;
}

/**
 * Compact ranking panel beside the hero: a four-row scroll viewport over the
 * whole board, with the merchant's own row pinned to the bottom edge — under a
 * fade and its progress line — until the scroll reaches its real position.
 */
export function ReferralLeaderboard({
  standings,
  currentEarned,
  currentReferralCount,
  currency,
}: ReferralLeaderboardProps) {
  const { rows, me, toReachFirst } = buildLeaderboardView(
    standings,
    currentEarned,
    currentReferralCount,
    currency
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Whether the merchant's row is currently pinned rather than sitting at its
  // real position. The fade and the progress line belong to the pinned state
  // only: once the row is in normal flow there is nothing behind it to fade, and
  // a gradient over fully visible rows would read as a stray overlay.
  //
  // Starts false so the first paint is the plain list — a short list that does
  // not scroll never pins, and this way it never flashes a fade it will not keep.
  const [isPinned, setIsPinned] = useState(false);

  // A 1px sentinel sits immediately after the row in flow, so its top edge is
  // exactly the row's natural bottom. While the row is pinned, that point is
  // below the scrollport and the sentinel cannot be seen; the moment the scroll
  // brings the row to its real position the sentinel enters view. So sentinel
  // visibility is the release point, observed rather than polled — no scroll
  // handler, and nothing measured on every frame.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // setState lives in the observer callback, not the effect body.
        if (entry) setIsPinned(!entry.isIntersecting);
      },
      { root, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    // Height is the four-row viewport plus the heading and the card's padding —
    // nothing else. It no longer needs `self-start` for that: it now sits in a
    // flex column (see index.tsx), where a child takes its own height and the
    // column carries the `self-start` that stops it stretching to the hero.
    <Card className="gap-4 p-5 sm:p-6">
      <Heading level={2} size="sm" color="subtle">
        Referral leaderboard
      </Heading>

      {/*
        The scroll viewport. Its height comes from ROW_HEIGHT × VISIBLE_ROWS plus
        the separators between those rows, so it is derived from the row's own
        type scale rather than set to a pixel guess — change the row's padding or
        text sizes and this follows.

        `scrollbar-none` keeps the surface clean; the faded row and the pinned
        merchant row are what signal there is more to scroll.
      */}
      <div
        ref={scrollRef}
        className="scrollbar-none overflow-y-auto overscroll-contain"
        style={{
          maxHeight: `calc(${VISIBLE_ROWS} * ${ROW_HEIGHT} + ${VISIBLE_ROWS - 1} * 1px)`,
        }}
      >
        {/*
          Every row is a direct child of this scroll container, via keyed
          fragments rather than per-row wrapper divs. That is what makes the
          sticky block below work at all: a sticky element can only offset within
          its containing block, so wrapping it in a div that is exactly its own
          height leaves it nowhere to slide and it renders as if it were static.
          Flat children give it the whole list as its containing block.
        */}
        {rows.map((entry, index) => {
          const isMe = me != null && entry.id === me.id;
          const separator = index < rows.length - 1 && <Separator className="bg-border/70" />;

          if (!isMe) {
            return (
              <Fragment key={entry.id}>
                <LeaderboardRow entry={entry} />
                {separator}
              </Fragment>
            );
          }

          // The merchant's row is the only sticky one, and it is the same single
          // row from the same list — never a second, separately positioned copy.
          // `bottom-0` anchors it to the foot of the scroll container for as long
          // as its real position is below the fold; once the scroll reaches that
          // position it releases into normal flow, and scrolling back up re-anchors
          // it. So there is exactly one "You" row at every scroll offset, with no
          // duplicate to keep in sync. The anchor is the container, not the page:
          // sticky resolves against the nearest scrollport, which is this div.
          return (
            <Fragment key={entry.id}>
              <div className="sticky bottom-0 z-10">
                {/* The fade, absolutely positioned just above the block's top edge
                    (`bottom-full`) so it contributes no layout height at all and
                    the anchor point stays exactly where the row alone would put
                    it. An earlier version used a negative top margin, which
                    collapsed into the sticky block and shifted its static position.
                    Transparent at the top so the row behind stays legible,
                    resolving to the card surface where the opaque area below
                    begins — that is what makes it read as the list continuing
                    rather than as a white slab. */}
                {isPinned && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-gradient-to-b from-transparent to-card"
                  />
                )}

                {/* Opaque from here down: the row's own tint is translucent, so
                    without this the rows scrolling beneath would show through it
                    while anchored. The tint composites over `bg-card` exactly as it
                    does over the card itself, so anchored and released look
                    identical. */}
                <div className="bg-card">
                  {isPinned && (
                    <div className="px-2.5 pt-1 pb-3">
                      <ProgressMessage toReach={toReachFirst} />
                    </div>
                  )}
                  <LeaderboardRow entry={entry} isCurrentMerchant />
                  {separator}
                </div>
              </div>

              {/* Release sentinel — see the observer above. */}
              <div ref={sentinelRef} aria-hidden className="h-px" />
            </Fragment>
          );
        })}
      </div>
    </Card>
  );
}
