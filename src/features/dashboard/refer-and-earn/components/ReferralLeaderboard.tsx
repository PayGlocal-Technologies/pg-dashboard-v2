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
 * The gap to the top of the board, stated in referrals — the figure the merchant
 * can actually act on. Flanked by up-arrows and set in the dashboard's positive
 * treatment, so it reads as progress rather than as a shortfall.
 */
function ProgressionMessage({ toPass, rank }: { toPass: number; rank: number }) {
  const positive = "text-emerald-600 dark:text-emerald-400";

  if (rank === 1) {
    return (
      <Text size="xs" weight="medium" className={cn("text-center", positive)}>
        You&rsquo;re #1 on the leaderboard
      </Text>
    );
  }

  if (toPass <= 0) {
    return (
      <Text size="xs" weight="medium" className={cn("text-center", positive)}>
        You&rsquo;ve matched #1 — one more pulls you ahead
      </Text>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-1.5", positive)}>
      <Icon name="arrow-up" size={13} strokeWidth={2.5} />
      <Text size="xs" weight="medium" className="text-inherit">
        {toPass} more referral{toPass === 1 ? "" : "s"} to pass #1
      </Text>
      <Icon name="arrow-up" size={13} strokeWidth={2.5} />
    </div>
  );
}

interface ReferralLeaderboardProps {
  standings: ReferralStandings;
  /**
   * The merchant's earned total and completed-referral count, from the same
   * summary the analytics row uses, so their row and the gap to #1 can never
   * disagree with the figures above them.
   */
  currentEarned: number;
  currentReferralCount: number;
  currency: string;
}

/**
 * Compact ranking panel beside the hero: the podium, the gap to #1, the entry
 * immediately above the merchant, and the merchant's own highlighted row. A
 * single static view — no leagues, no tabs.
 */
export function ReferralLeaderboard({
  standings,
  currentEarned,
  currentReferralCount,
  currency,
}: ReferralLeaderboardProps) {
  const { podium, above, below, me, meOnPodium, toPassFirst } = buildLeaderboardView(
    standings,
    currentEarned,
    currentReferralCount,
    currency
  );

  return (
    // Content starts at the top of the card; only the card's own padding sits
    // above the heading.
    //
    // This card is the height source for the row it shares with the hero, so it
    // carries no height at all — it hugs the heading, the rows, and its own
    // padding, and that measurement is what the auto grid row in index.tsx
    // resolves to and what the hero is then stretched to match. Deliberately no
    // `h-full`: a height here would resolve against the very row this content
    // is sizing, and it is what used to leave the board padded out with dead
    // space. Nothing caps or scrolls the rows either, so however many rungs the
    // standings return, they are all in frame and the row height moves with
    // them.
    <Card className="gap-4 p-5 sm:p-6">
      <Heading level={2} size="sm" color="subtle">
        Referral leaderboard
      </Heading>

      <div className="flex flex-col">
        {podium.map((entry, index) => (
          <div key={entry.id}>
            <LeaderboardRow
              entry={entry}
              // If the merchant is on the podium the highlight rides their podium
              // row and no separate row is repeated below.
              isCurrentMerchant={meOnPodium && me?.rank === entry.rank}
            />
            {/* Between the podium rows only — nothing trails the third. */}
            {index < podium.length - 1 && <Separator className="bg-border/70" />}
          </div>
        ))}

        {me != null && (
          <>
            {/* More breathing room than the row rhythm: this line separates the
                podium from the merchant's own neighbourhood, which is why there
                is no ellipsis marker doing that job. */}
            <div className="px-2.5 pt-5 pb-4">
              <ProgressionMessage toPass={toPassFirst} rank={me.rank} />
            </div>

            {/* The rungs they pass next, each closed off with the same subtle
                divider the podium rows use. Unlike the podium, the last one keeps
                its divider: it is what separates this block from the merchant's
                own highlighted row, and it means the rung above them always has a
                line beneath it however many rungs the standings return. */}
            {above.map((entry) => (
              <div key={entry.id}>
                <LeaderboardRow entry={entry} />
                <Separator className="bg-border/70" />
              </div>
            ))}

            {!meOnPodium && <LeaderboardRow entry={me} isCurrentMerchant />}

            {/* The rungs behind them. No divider above these: the merchant's own
                tinted row is already the break between the two blocks. */}
            {below.map((entry) => (
              <LeaderboardRow key={entry.id} entry={entry} />
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
