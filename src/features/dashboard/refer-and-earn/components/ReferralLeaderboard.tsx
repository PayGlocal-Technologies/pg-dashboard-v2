"use client";

import { useState } from "react";
import {
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { LEAGUE_IDS } from "@/features/dashboard/refer-and-earn/constants";
import type {
  LeaderboardEntry,
  LeagueId,
  LeagueLeaderboard,
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
          "shrink-0 text-[13px] tabular-nums",
          isCurrentMerchant ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {formatCurrency(entry.amount, entry.currency, "en-US")}
      </span>
    </div>
  );
}

/**
 * One league marker: a rotated square with its number counter-rotated upright, so
 * it reads as a diamond rather than a rectangular tab. Three states — the league
 * being viewed carries the strong dark outline from the reference, leagues the
 * merchant has cleared sit a step back, and leagues still ahead of them are muted.
 */
function LeagueDiamond({
  league,
  state,
}: {
  league: LeagueId;
  state: "selected" | "cleared" | "locked";
}) {
  return (
    <span
      className={cn(
        "flex size-11 rotate-45 items-center justify-center rounded-[8px] border-2 transition-colors",
        state === "selected" && "border-foreground",
        state === "cleared" && "border-foreground/40",
        state === "locked" && "border-border"
      )}
    >
      <span
        className={cn(
          "-rotate-45 text-base font-semibold tabular-nums",
          state === "selected" && "text-foreground",
          state === "cleared" && "text-foreground/60",
          state === "locked" && "text-muted-foreground/70"
        )}
      >
        {league}
      </span>
    </span>
  );
}

/**
 * The gap to the top of the league, stated in referrals — advancing means passing
 * #1, so this one line is the whole progression rule. Only rendered for the
 * merchant's own league: elsewhere there is no "you" to measure a gap for.
 */
function ProgressionMessage({ league, toPass }: { league: LeagueId; toPass: number }) {
  if (toPass <= 0) {
    return (
      <Text
        size="xs"
        weight="medium"
        className="text-center text-emerald-600 dark:text-emerald-400"
      >
        {league === 3
          ? "You passed #1 — you're top of the highest league"
          : "You passed #1 — you've advanced to the next league"}
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

/**
 * One league's standings: its podium, then — in the merchant's own league — the
 * progression line and their own highlighted row, however far down they sit.
 */
function LeaguePanel({
  board,
  isOwnLeague,
  currentEarned,
  currentReferralCount,
  currency,
}: {
  board: LeagueLeaderboard;
  isOwnLeague: boolean;
  currentEarned: number;
  currentReferralCount: number;
  currency: string;
}) {
  // The merchant only holds a position in their own league. Their amount and
  // referral count come from the live summary rather than the standings payload,
  // so this row and the analytics row above can never disagree.
  const me =
    isOwnLeague && board.currentMerchant
      ? { ...board.currentMerchant, amount: currentEarned, currency }
      : null;

  const leader = board.top[0];
  const onPodium = me != null && me.rank <= board.top.length;

  return (
    <div className="flex flex-col gap-0.5">
      {board.top.map((entry) => (
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
              the elision, so there is no separate ellipsis marker. The gap is
              (#1's count − theirs), which is the figure the reference states. */}
          <div className="px-2.5 pt-2.5 pb-1.5">
            <ProgressionMessage
              league={board.league}
              toPass={(leader?.referralCount ?? 0) - currentReferralCount}
            />
          </div>
          {/* Only when they are not already in the podium above — the merchant is
              never listed twice. */}
          {!onPodium && <LeaderboardRow entry={me} isCurrentMerchant />}
        </>
      )}
    </div>
  );
}

interface ReferralLeaderboardProps {
  /** Standings per league. */
  leaderboards: Record<LeagueId, LeagueLeaderboard>;
  /** The league the merchant currently sits in. */
  currentLeague: LeagueId;
  /**
   * The merchant's earned total and completed-referral count, from the same
   * summary the analytics row uses.
   */
  currentEarned: number;
  currentReferralCount: number;
  currency: string;
}

/**
 * Compact gamification panel beside the hero: the three league markers, the
 * podium for the selected league, the gap to #1, and the merchant's own row.
 */
export function ReferralLeaderboard({
  leaderboards,
  currentLeague,
  currentEarned,
  currentReferralCount,
  currency,
}: ReferralLeaderboardProps) {
  // Opens on the merchant's own league — the one standing they can actually move.
  const [selected, setSelected] = useState<LeagueId>(currentLeague);

  return (
    <Card className="h-full justify-center gap-5 p-5 sm:p-6">
      {/* No visible title, per the reference — but the card still needs a name in
          the accessibility tree, so it is announced rather than drawn. */}
      <VisuallyHidden>
        <h2>Referral leaderboard</h2>
      </VisuallyHidden>

      <Tabs value={String(selected)} onValueChange={(v) => setSelected(Number(v) as LeagueId)}>
        {/* TabsList/TabsTrigger keep the segmented-control semantics — one
            tablist, roving focus, arrow-key navigation — while the Flux chrome
            (bordered track, active card fill) is stripped back so the diamonds
            themselves carry the state. */}
        <TabsList
          aria-label="Referral league"
          className="h-auto w-full justify-center gap-3 rounded-none border-0 bg-transparent p-0"
        >
          {LEAGUE_IDS.map((league) => (
            <TabsTrigger
              key={league}
              value={String(league)}
              aria-label={`League ${league}${league > currentLeague ? " (not reached yet)" : ""}`}
              className="h-auto rounded-lg bg-transparent p-1 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LeagueDiamond
                league={league}
                state={
                  league === selected ? "selected" : league < currentLeague ? "cleared" : "locked"
                }
              />
            </TabsTrigger>
          ))}
        </TabsList>

        {/* One panel per league, each rendering its own league's standings rather
            than the selected board's — so a panel is correct on its own terms and
            does not depend on only the active one being mounted. */}
        {LEAGUE_IDS.map((league) => (
          <TabsContent key={league} value={String(league)} className="mt-5">
            <LeaguePanel
              board={leaderboards[league]}
              isOwnLeague={league === currentLeague}
              currentEarned={currentEarned}
              currentReferralCount={currentReferralCount}
              currency={currency}
            />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
