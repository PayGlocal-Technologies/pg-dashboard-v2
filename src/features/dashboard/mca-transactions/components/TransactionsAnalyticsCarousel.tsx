"use client";

import { useRef, useState, type UIEvent } from "react";
import { ProgressIndicator } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  SettlementAnalyticsCard,
  type TimeRange,
} from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
import { SavedAmountCard } from "@/features/dashboard/mca-transactions/components/SavedAmountCard";
// Reused from the settlement report feature rather than reimplemented: this is
// the same card, on the same data, and a second copy would be free to drift
// from it. Cross-feature imports are established here (SettlementAnalyticsCard
// takes CountryFlagAvatar from multi-currency the same way).
import { TotalSettledCard } from "@/features/dashboard/mca-settlement-report/components/TotalSettledCard";
import type { TotalSettledTimeframe } from "@/features/dashboard/mca-settlement-report/constants";
import { useSettlementOverview } from "@/features/dashboard/mca-settlement-report/hooks";
import { useScopeId } from "@/lib/hooks/useScopeId";

// One entry per carousel page, in DOM order. Doubles as the indicator's
// accessible labels, so the two can't fall out of step with each other.
const PAGE_LABELS = ["Total settled analytics", "Outstanding and saved amount"];
const LAST_PAGE = PAGE_LABELS.length - 1;

// One width for every page, applied through this shared constant rather than
// repeated per page, so the two can't end up different sizes and snap
// inconsistently.
//
// w-full, not something narrower: each page fills the whole scroll container,
// which itself carries no horizontal padding, so the active page is flush
// with the page's own margins with nothing of the next page in view. The
// gap-4 between pages (below) only shows as dead space mid-swipe. At rest,
// snap-start lands the next page's left edge exactly at the container's right
// edge, so there's no residual peek from it either.
//
// lg:w-auto hands sizing back to the grid column from lg up: the same
// breakpoint McaTransactionTable switches its own table/card-list and
// controls at, so the whole page moves to its "mobile" presentation at one
// width instead of the analytics section switching early on its own.
const PAGE_CLASSES = "w-full shrink-0 snap-start lg:w-auto";

/** Section TimeRange → the document-pending endpoint's timeframe param. Same
 *  mapping the settled/saved cards use internally. */
const TIMEFRAME_BY_RANGE: Record<TimeRange, string> = {
  today: "today",
  week: "week",
  month: "month",
  year: "ytd",
};

/**
 * Section TimeRange → the settlement overview's own timeframe vocabulary,
 * now that Total settled follows the page's range control rather than
 * carrying a switcher of its own.
 *
 * `today` is the one that does not map cleanly: the overview endpoint has no
 * daily bucket, so Today falls back to the week. That is an approximation —
 * with Today selected this card reports the week's settled total, not the
 * day's — and the honest fix is a daily bucket on the endpoint rather than
 * anything the client can do. Every other value is a direct rename.
 */
const SETTLED_TIMEFRAME_BY_RANGE: Record<TimeRange, TotalSettledTimeframe> = {
  today: "week",
  week: "week",
  month: "month",
  year: "ytd",
};

// Both of these take the element as a parameter rather than reading
// scrollRef.current inline, matching restoreScrollTop in McaTransactionTable:
// React Compiler's lint forbids touching a hook-returned value directly in a
// component body or handler.

/** Which page is closest to the current scroll offset. */
function pageFromScroll(el: HTMLDivElement): number {
  // Derived from the scrollable distance rather than a page width, so it stays
  // correct whatever the slides' own widths and gap work out to.
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return 0;
  return Math.round((el.scrollLeft / maxScroll) * LAST_PAGE);
}

function scrollToPage(el: HTMLDivElement, index: number): void {
  const maxScroll = el.scrollWidth - el.clientWidth;
  el.scrollTo({ left: (maxScroll * index) / LAST_PAGE, behavior: "smooth" });
}

/**
 * The Transactions page's analytics summary, in two layouts over the same two
 * children so neither is duplicated:
 *
 * - Below lg, a horizontally scrolling carousel of two snap pages (Settlement
 *   Analytics, then the Outstanding + Saved stack) with a ProgressIndicator
 *   beneath it. Same breakpoint McaTransactionTable's own table/card-list
 *   switch uses, so the analytics summary and the transaction list below it
 *   both flip to their mobile presentation together, not at two different
 *   widths.
 * - From lg up, a single 2-column × 2-row grid: Total amount collected beside
 *   Documents pending in row 1, Total settled beside Saved amount in row 2.
 *   Each ROW is height-matched — the two cards in it always end at the same
 *   bottom edge — but the two ROWS are NOT matched to each other, which is
 *   the deliberate difference from an earlier version of this grid that used
 *   `grid-rows-[1fr_1fr]` and matched everything to everything (see the
 *   `lg:contents` comment below for why that coupling was a problem, and why
 *   plain `auto` rows don't have it).
 *
 * The time-range control itself lives in the page header now (see
 * McaTransactionsFeature/AnalyticsTimeRangeControl), in line with the
 * "Transactions" title rather than inside this section; timeRange just
 * arrives here as a prop to pass down to Settlement Analytics and Saved
 * Amount. Neither's live endpoint actually has a period parameter (see
 * SettlementAnalyticsCard's own TIME_RANGE_MULTIPLIERS comment), so both
 * scale a real lifetime figure by the same approximation multiplier rather
 * than showing a genuine per-period total. Outstanding Amount isn't wired to
 * it at all: its own KPI (settlementsDue) is a live balance, not something a
 * historical time window applies to.
 */
export function TransactionsAnalyticsCarousel({ timeRange }: { timeRange: TimeRange }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  const { scopeId } = useScopeId("PACB");
  const { overview } = useSettlementOverview(scopeId, SETTLED_TIMEFRAME_BY_RANGE[timeRange]);
  // No mock fallback, matching the settlement page: an overview that has not
  // loaded shows zero and an empty chart, never an invented figure.
  const settledChartData = overview
    ? overview.series.map((point) => ({ x: point.label, y: point.value }))
    : [];

  return (
    // gap-2 (8px) between the carousel and its indicator: deliberately much
    // tighter than the spacing that separates this whole block from the
    // transaction list below it (see McaTransactionTable), so the indicator
    // reads as part of the carousel rather than as a divider between the
    // summary and the data.
    <div className="flex flex-col gap-2">
      <div
        ref={scrollRef}
        // Same scrollbar-none/snap treatment as the multi-currency account
        // carousel. py-1 (offset by -my-1, so the cards still sit where they
        // would with no padding at all) keeps overflow-x-auto's implicit
        // vertical clip off each card's shadow. Vertical only, unlike that
        // carousel's uniform p-1: horizontal padding would sit inside the
        // scrollport and widen the peek past the 16px PAGE_CLASSES budgets
        // for, and shadow-sm spreads too little sideways to need it.
        //
        // No `lg:grid-rows-[...]` here on purpose. Plain `auto` rows (the
        // default when none is specified) already stretch the items WITHIN
        // one row to match each other — that is ordinary CSS Grid behaviour,
        // not something `1fr` is needed for — but an `auto` row's size does
        // NOT get redistributed against its sibling rows the way `fr` tracks
        // do. That distinction is exactly what an earlier version of this
        // grid got backwards: it used `grid-rows-[1fr_1fr]` to try to match
        // row 1 and row 2 to each other, which also, as an unwanted side
        // effect, coupled every card's height to the OTHER row's tallest
        // card. That's what made switching to "Today" look like cards were
        // "expanding dramatically" — Total amount collected/Total settled go
        // short in an empty window, Documents pending/Saved amount don't,
        // and the `1fr` rows stretched the now-short row up to match the
        // still-tall one. Plain `auto` rows give the within-row matching
        // that's actually wanted (see the component doc comment) without
        // that cross-row coupling.
        className="scrollbar-none -my-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth py-1
                   lg:my-0 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-visible lg:py-0"
        onScroll={(e: UIEvent<HTMLDivElement>) => setActivePage(pageFromScroll(e.currentTarget))}
      >
        {/* `lg:contents` is what lets the two rows above align independently
            of each other: below lg this stays a real element (a carousel
            page holding its own flex-col stack), but from lg up
            `display: contents` removes the wrapper box entirely, promoting
            these two cards to be direct items of the grid above — in
            columns 1/1, rows 1/2 via the explicit placement below — rather
            than a nested box the grid can only size as one unit. Without
            this, "column 1" would be a single grid cell exactly as tall as
            its own two stacked cards, with no way for row 1 of it to align
            with row 1 of column 2 independently of row 2. */}
        <div className={cn("flex flex-col gap-4", PAGE_CLASSES, "lg:contents")}>
          <SettlementAnalyticsCard
            timeRange={timeRange}
            className="lg:col-start-1 lg:row-start-1 lg:h-full"
          />
          {/* No `onTimeframeChange`, which is what hides this card's own
              week/month/year switcher — the page header's range control
              drives it instead, through SETTLED_TIMEFRAME_BY_RANGE above.

              The chart keeps a fixed height only below lg, where this is a
              carousel page and the card sizes to its own content. From lg up
              it becomes a flex child that absorbs the card's leftover height
              (`lg:flex-1`), which is what lets the card fill however tall
              row 2 ends up being (row 2's height is set by whichever of this
              card and Saved amount is naturally taller). `lg:min-h-0` is
              the part that makes shrinking possible at all: a flex item's
              default `min-height: auto` floors it at its content height, so
              without this the chart could grow but never give height back. */}
          <TotalSettledCard
            totalSettled={overview?.totalSettled ?? 0}
            totalSettledTrendPct={overview?.totalSettledTrendPct ?? 0}
            comparisonLabel={overview?.comparisonLabel}
            timeframe={SETTLED_TIMEFRAME_BY_RANGE[timeRange]}
            chartData={settledChartData}
            chartClassName="h-40 lg:h-auto lg:min-h-0 lg:flex-1"
            className="lg:col-start-1 lg:row-start-2 lg:h-full"
          />
        </div>

        {/* `lg:contents` for the same reason as the column above. Auto
            placement would fill row-wise and scatter these (the DOM here is
            column-major: both left cards, then both right), so every card
            names its own column and row explicitly. */}
        <div className={cn("flex flex-col gap-4", PAGE_CLASSES, "lg:contents")}>
          <OutstandingAmountCard
            timeframe={TIMEFRAME_BY_RANGE[timeRange]}
            className="lg:col-start-2 lg:row-start-1 lg:h-full"
          />
          <SavedAmountCard
            timeRange={timeRange}
            className="lg:col-start-2 lg:row-start-2 lg:h-full"
          />
        </div>
      </div>

      {/* Flux's own ProgressIndicator, which already renders exactly the
          requested states (the active page as a short bar, the inactive one as
          a dot) at its smallest size, so there's no custom indicator here.
          Clicking or arrow-keying a dot scrolls to that page, and scrolling
          moves the indicator, so the two stay in sync whichever one the reader
          drives. */}
      <div className="flex justify-center lg:hidden">
        <ProgressIndicator
          aria-label="Analytics pages"
          size="sm"
          values={PAGE_LABELS}
          selectedIndex={activePage}
          onChange={(index) => {
            const el = scrollRef.current;
            if (el) scrollToPage(el, index);
          }}
        />
      </div>
    </div>
  );
}
