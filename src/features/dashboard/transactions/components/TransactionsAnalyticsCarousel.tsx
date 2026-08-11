"use client";

import { useRef, useState, type UIEvent } from "react";
import { ProgressIndicator } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SettlementAnalyticsCard } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/transactions/components/OutstandingAmountCard";
import { SavedAmountCard } from "@/features/dashboard/transactions/components/SavedAmountCard";

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
// md:w-auto hands sizing back to the grid column from md up.
const PAGE_CLASSES = "w-full shrink-0 snap-start md:w-auto";

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
 * - Below md, a horizontally scrolling carousel of two snap pages (Settlement
 *   Analytics, then the Outstanding + Saved stack) with a ProgressIndicator
 *   beneath it.
 * - From md up, the existing grid: one column at md, then Settlement Analytics
 *   as the wider card at lg with the other two as a stacked secondary column.
 *   No carousel and no indicator there, so nothing about tablet or desktop
 *   changes.
 */
export function TransactionsAnalyticsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

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
        className="scrollbar-none -my-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth py-1
                   md:my-0 md:grid md:overflow-visible md:py-0
                   lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
        onScroll={(e: UIEvent<HTMLDivElement>) => setActivePage(pageFromScroll(e.currentTarget))}
      >
        <div className={PAGE_CLASSES}>
          <SettlementAnalyticsCard />
        </div>

        {/* grow (not flex-1, whose 0 basis would force both cards to the same
            height and clip the taller one) lets the two split whatever height
            the taller Settlement Analytics page sets, so the stack reads as
            one page of equivalent weight beside it. Only below md: from md up
            these are grid items again, where the column already stretches and
            the cards should stay at their natural heights, exactly as
            before. */}
        <div className={cn("flex flex-col gap-4", PAGE_CLASSES)}>
          <OutstandingAmountCard className="grow md:grow-0" />
          <SavedAmountCard className="grow md:grow-0" />
        </div>
      </div>

      {/* Flux's own ProgressIndicator, which already renders exactly the
          requested states (the active page as a short bar, the inactive one as
          a dot) at its smallest size, so there's no custom indicator here.
          Clicking or arrow-keying a dot scrolls to that page, and scrolling
          moves the indicator, so the two stay in sync whichever one the reader
          drives. */}
      <div className="flex justify-center md:hidden">
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
