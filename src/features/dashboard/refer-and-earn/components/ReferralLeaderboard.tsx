"use client";

import { useState } from "react";
import { Card, Heading, Tabs, TabsContent, TabsList, TabsTrigger, Text } from "@/components/ui";
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
 * Gold / silver / bronze for the podium, muted for everyone below it. Hue-matched
 * the way StatusBadge's variants are, with dark-mode counterparts, rather than
 * literal metallic gradients.
 */
const MEDAL_CLASS: Record<number, string> = {
  1: "bg-amber-400/25 text-amber-800 ring-amber-500/35 dark:bg-amber-400/25 dark:text-amber-100 dark:ring-amber-300/45",
  2: "bg-slate-300/35 text-slate-700 ring-slate-400/35 dark:bg-slate-300/20 dark:text-slate-100 dark:ring-slate-300/40",
  3: "bg-orange-500/20 text-orange-900 ring-orange-600/30 dark:bg-orange-500/25 dark:text-orange-100 dark:ring-orange-300/40",
};

function RankMedal({ rank }: { rank: number }) {
  const medal = MEDAL_CLASS[rank];

  // Off the podium there is no medal — the rank reads as a plain figure, which is
  // what keeps the top three feeling like a podium at all.
  if (!medal) {
    return (
      <span className="w-6 shrink-0 text-center text-[12px] font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ring-1 ring-inset",
        medal
      )}
    >
      {rank}
    </span>
  );
}

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
        "flex items-center gap-3 rounded-lg px-2 py-2",
        // The merchant's own row is tinted with the brand surface so they can
        // find themselves at a glance — a wash, not a filled band, so it never
        // outweighs the podium above it.
        isCurrentMerchant && "bg-primary/10"
      )}
    >
      <RankMedal rank={entry.rank} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px]",
          isCurrentMerchant ? "font-semibold text-foreground" : "font-medium text-foreground"
        )}
      >
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
 * One league marker: a rotated square with its number counter-rotated back to
 * upright. Three states, so the diamonds read as a route rather than three
 * equivalent tabs — cleared behind you, where you are, still locked ahead.
 */
function LeagueDiamond({
  league,
  state,
}: {
  league: LeagueId;
  state: "cleared" | "current" | "locked";
}) {
  return (
    <span
      className={cn(
        "flex size-9 rotate-45 items-center justify-center rounded-[7px] border-2 transition-colors",
        state === "current" && "border-primary bg-primary/10",
        state === "cleared" && "border-foreground/35 bg-transparent",
        state === "locked" && "border-border bg-transparent"
      )}
    >
      <span
        className={cn(
          "-rotate-45 text-[13px] font-semibold tabular-nums",
          state === "current" && "text-primary",
          state === "cleared" && "text-foreground/70",
          state === "locked" && "text-muted-foreground/60"
        )}
      >
        {league}
      </span>
    </span>
  );
}

/**
 * One league's standings: its podium, and — in the merchant's own league — their
 * position pinned below it however far down the table it sits.
 */
function LeaguePanel({
  board,
  isOwnLeague,
  currentEarned,
  currency,
}: {
  board: LeagueLeaderboard;
  isOwnLeague: boolean;
  currentEarned: number;
  currency: string;
}) {
  // The merchant only holds a position in their own league; other panels show
  // that league's podium alone. Their amount comes from the live summary rather
  // than the standings payload, so it tracks the analytics row exactly.
  const me =
    isOwnLeague && board.currentMerchant
      ? { ...board.currentMerchant, amount: currentEarned, currency }
      : null;

  const onPodium = me != null && me.rank <= board.top.length;

  return (
    <div className="flex flex-col gap-0.5">
      {board.top.map((entry) => (
        <LeaderboardRow
          key={entry.id}
          entry={entry}
          // If the merchant is already on the podium, the highlight rides their
          // podium row and the elided tail below is dropped.
          isCurrentMerchant={onPodium && me?.rank === entry.rank}
        />
      ))}

      {/* The merchant stays visible however far down they are: the gap between
          the podium and their row is elided, not the row itself. */}
      {me != null && !onPodium && (
        <>
          <span className="flex justify-center py-0.5 text-muted-foreground/60" aria-hidden>
            <Icon name="more-horizontal" size={16} />
          </span>
          <LeaderboardRow entry={me} isCurrentMerchant />
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
   * The merchant's own earned total, from the same summary the analytics row
   * uses, so the "You" row can never disagree with it.
   */
  currentEarned: number;
  currency: string;
}

/**
 * Compact gamification panel beside the hero: the three league markers, the
 * podium for the selected league, and the merchant's own standing pinned below
 * it however far down the table it sits.
 */
export function ReferralLeaderboard({
  leaderboards,
  currentLeague,
  currentEarned,
  currency,
}: ReferralLeaderboardProps) {
  // Opens on the merchant's own league — the one standing they can actually move.
  const [selected, setSelected] = useState<LeagueId>(currentLeague);
  const leader = leaderboards[selected].top[0];

  /**
   * One line explaining where the selected league sits relative to the merchant.
   * Advancing means passing #1 of your own league, so for the current league that
   * is stated as the remaining gap — the whole rule in one figure.
   */
  function progressCaption(): string {
    if (selected > currentLeague) {
      return `Locked — pass #1 in League ${selected - 1} to reach League ${selected}`;
    }
    if (selected < currentLeague) return "Cleared";
    if (selected === 3) return "Top league — nothing above this one";

    const gap = Math.max(0, (leader?.amount ?? 0) - currentEarned);
    return `${formatCurrency(gap, currency, "en-US")} to pass #1 and reach League ${selected + 1}`;
  }

  return (
    <Card className="h-full gap-4 p-5 sm:p-6">
      <Heading level={2} size="sm">
        Referral leaderboard
      </Heading>

      <Tabs value={String(selected)} onValueChange={(v) => setSelected(Number(v) as LeagueId)}>
        {/* TabsList/TabsTrigger keep the segmented-control semantics — one
            tablist, roving focus, arrow-key navigation — while the Flux chrome
            (bordered track, active card fill) is stripped back so the diamonds
            themselves carry the state. */}
        <TabsList
          aria-label="Referral league"
          className="h-auto w-full justify-center gap-0 rounded-none border-0 bg-transparent p-0"
        >
          {LEAGUE_IDS.map((league, index) => (
            <span key={league} className="flex items-center">
              {/* Connector: the markers read as a path from one league to the
                  next rather than three interchangeable tabs. */}
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-5",
                    league <= currentLeague ? "bg-foreground/25" : "bg-border"
                  )}
                />
              )}
              <TabsTrigger
                value={String(league)}
                aria-label={`League ${league}${league > currentLeague ? " (locked)" : ""}`}
                className="h-auto rounded-lg bg-transparent p-1.5 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <LeagueDiamond
                  league={league}
                  state={
                    league === currentLeague
                      ? "current"
                      : league < currentLeague
                        ? "cleared"
                        : "locked"
                  }
                />
              </TabsTrigger>
            </span>
          ))}
        </TabsList>

        <Text size="xs" color="subtle" className="mt-1 text-center">
          {progressCaption()}
        </Text>

        {/* One TabsContent per league, each rendering its own league's standings
            rather than the selected board's — so a panel is correct on its own
            terms and does not depend on only the active one being mounted. */}
        {LEAGUE_IDS.map((league) => (
          <TabsContent key={league} value={String(league)} className="mt-4">
            <LeaguePanel
              board={leaderboards[league]}
              isOwnLeague={league === currentLeague}
              currentEarned={currentEarned}
              currency={currency}
            />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
