"use client";

import { useRef, useState, type UIEvent } from "react";
import { ProgressIndicator } from "@/components/ui";
import { SettlementAnalyticsCard } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/transactions/components/OutstandingAmountCard";
import { SavedAmountCard } from "@/features/dashboard/transactions/components/SavedAmountCard";

// One entry per carousel page, in DOM order. Doubles as the indicator's
// accessible labels, so the two can't fall out of step with each other.
const PAGE_LABELS = ["Total settled analytics", "Outstanding and saved amount"];
const LAST_PAGE = PAGE_LABELS.length - 1;

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
        // carousel, and the same p-1 there (offset by -m-1 so the cards still
        // line up with the rest of the page) so overflow-x-auto's implicit
        // vertical clip doesn't shave each card's rounded corners or shadow.
        className="scrollbar-none -m-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-1
                   md:m-0 md:grid md:overflow-visible md:p-0
                   lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
        onScroll={(e: UIEvent<HTMLDivElement>) => setActivePage(pageFromScroll(e.currentTarget))}
      >
        {/* calc(100% - 2.5rem), not 100%: leaves a sliver of the next page in
            view as the affordance that there's a second one, so the carousel
            doesn't look like a single card that happens to be inset.
            md:w-auto hands sizing back to the grid column. */}
        <div className="w-[calc(100%-2.5rem)] shrink-0 snap-start md:w-auto">
          <SettlementAnalyticsCard />
        </div>

        {/* grow (not flex-1, whose 0 basis would force both cards to the same
            height and clip the taller one) lets the two split whatever height
            the taller Settlement Analytics page sets, so the stack reads as
            one page of equivalent weight beside it. Only below md: from md up
            these are grid items again, where the column already stretches and
            the cards should stay at their natural heights, exactly as
            before. */}
        <div className="flex w-[calc(100%-2.5rem)] shrink-0 snap-start flex-col gap-4 md:w-auto">
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
