import { Card, Heading, Text } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
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

/** Podium ranks get a medal; everyone below reads as a plain figure. */
function RankIndicator({ rank }: { rank: number }) {
  const medal = MEDAL_CLASS[rank];

  if (!medal) {
    return (
      <span className="w-7 shrink-0 text-center text-[13px] font-semibold tabular-nums text-foreground">
        {rank}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ring-1 ring-inset",
        medal
      )}
    >
      {rank}
    </span>
  );
}

/** [ rank ] [ name ] ……… [ amount ] — one rhythm for every row on the board. */
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
        "flex items-center gap-3 rounded-lg px-2.5 py-2",
        // The merchant's own row is washed with the brand surface so they can
        // find themselves at a glance, without outweighing the podium above it.
        isCurrentMerchant && "bg-primary/15"
      )}
    >
      <RankIndicator rank={entry.rank} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {entry.displayName}
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-[13px] tabular-nums",
          isCurrentMerchant ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {formatCurrency(entry.amount, entry.currency, "en-US")}
      </span>
    </div>
  );
}

/**
 * The gap to the top of the board, stated in referrals — the figure the merchant
 * can actually act on. Flanked by up-arrows and set in the dashboard's positive
 * treatment, so it reads as progress rather than as a shortfall.
 */
function ProgressionMessage({ toPass }: { toPass: number }) {
  if (toPass <= 0) {
    return (
      <Text
        size="xs"
        weight="medium"
        className="text-center text-emerald-600 dark:text-emerald-400"
      >
        You passed #1 — you&rsquo;re top of the leaderboard
      </Text>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
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
   * summary the analytics row uses, so the "You" row and the gap to #1 can never
   * disagree with the figures above them.
   */
  currentEarned: number;
  currentReferralCount: number;
  currency: string;
}

/**
 * Compact ranking panel beside the hero: the podium, the gap to #1, and the
 * merchant's own highlighted row. A single static view — no leagues, no tabs.
 */
export function ReferralLeaderboard({
  standings,
  currentEarned,
  currentReferralCount,
  currency,
}: ReferralLeaderboardProps) {
  const leader = standings.top[0];

  // Amount and referral count come from the live summary rather than the
  // standings payload; only the rank is the server's to know.
  const me = standings.currentMerchant
    ? { ...standings.currentMerchant, amount: currentEarned, currency }
    : null;

  const onPodium = me != null && me.rank <= standings.top.length;

  return (
    <Card className="h-full justify-center gap-5 p-5 sm:p-6">
      <Heading level={2} size="sm" color="subtle">
        Referral leaderboard
      </Heading>

      <div className="flex flex-col gap-0.5">
        {standings.top.map((entry) => (
          <LeaderboardRow
            key={entry.id}
            entry={entry}
            // If the merchant is already on the podium the highlight rides their
            // podium row, and nothing is repeated below it.
            isCurrentMerchant={onPodium && me?.rank === entry.rank}
          />
        ))}

        {me != null && (
          <>
            {/* Sits between the podium and the merchant's row — it is what carries
                the jump in rank, so there is no separate ellipsis marker. */}
            <div className="px-2.5 pt-2.5 pb-2.5">
              <ProgressionMessage toPass={(leader?.referralCount ?? 0) - currentReferralCount} />
            </div>
            {/* Only when they are not already in the podium above — the merchant
                is never listed twice. */}
            {!onPodium && <LeaderboardRow entry={me} isCurrentMerchant />}
          </>
        )}
      </div>
    </Card>
  );
}
