import { Card, Heading, Separator, Text } from "@/components/ui";
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
 * whole board, with the merchant's own row pinned to the bottom edge until the
 * scroll reaches its real position.
 */
export function ReferralLeaderboard({
  standings,
  currentEarned,
  currentReferralCount,
  currency,
}: ReferralLeaderboardProps) {
  const { rows, me } = buildLeaderboardView(
    standings,
    currentEarned,
    currentReferralCount,
    currency
  );

  return (
    // Height is the four-row viewport plus the heading and the card's padding —
    // nothing else. `self-start` keeps it at exactly that: a grid item stretches
    // to its row by default, and the row is as tall as the hero beside it.
    <Card className="gap-4 self-start p-5 sm:p-6">
      <Heading level={2} size="sm" color="subtle">
        Referral leaderboard
      </Heading>

      {/*
        The scroll viewport. Its height comes from ROW_HEIGHT × VISIBLE_ROWS plus
        the separators between those rows, so it is derived from the row's own
        type scale rather than set to a pixel guess — change the row's padding or
        text sizes and this follows.

        `scrollbar-none` keeps the surface clean; the clipped row and the pinned
        merchant row are what signal there is more to scroll.
      */}
      <div
        className="scrollbar-none overflow-y-auto overscroll-contain"
        style={{
          maxHeight: `calc(${VISIBLE_ROWS} * ${ROW_HEIGHT} + ${VISIBLE_ROWS - 1} * 1px)`,
        }}
      >
        {rows.map((entry, index) => {
          const isMe = me != null && entry.id === me.id;

          const row = (
            <>
              <LeaderboardRow entry={entry} isCurrentMerchant={isMe} />
              {index < rows.length - 1 && <Separator className="bg-border/70" />}
            </>
          );

          // The merchant's row is the only sticky one, and it is the same single
          // row from the same list — never a second, separately positioned copy.
          // `bottom-0` pins it to the foot of the viewport for as long as its real
          // position is below the fold; once the scroll reaches that position it
          // releases into normal flow, and scrolling back up re-pins it. So there
          // is exactly one "You" row at every scroll offset, with no JS and no
          // duplicate to keep in sync.
          //
          // `bg-card` on the wrapper is load-bearing: the row's own tint is
          // translucent, so without an opaque backing the rows scrolling beneath
          // it would show through while it is pinned. The tint composites over
          // `bg-card` here exactly as it does over the card itself, so the pinned
          // and released states look identical.
          return isMe ? (
            <div key={entry.id} className="sticky bottom-0 z-10 bg-card">
              {row}
            </div>
          ) : (
            <div key={entry.id}>{row}</div>
          );
        })}
      </div>
    </Card>
  );
}
