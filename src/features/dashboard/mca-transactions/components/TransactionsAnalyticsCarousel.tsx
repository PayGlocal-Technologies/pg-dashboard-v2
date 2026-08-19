"use client";

import { useRef, useState, type UIEvent } from "react";
import { ProgressIndicator } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SettlementAnalyticsCard } from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
import { SavedAmountCard } from "@/features/dashboard/mca-transactions/components/SavedAmountCard";

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
 * - From lg up, the grid: Settlement Analytics as the wider card beside the
 *   Outstanding + Saved stack as a secondary column, both filling the same
 *   overall height. No carousel and no indicator there, so desktop layout is
 *   unchanged beyond that column split and height match.
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
                   lg:my-0 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-visible lg:py-0"
        onScroll={(e: UIEvent<HTMLDivElement>) => setActivePage(pageFromScroll(e.currentTarget))}
      >
        {/* lg:h-full only: from lg up the two page wrappers are grid items in
            the same row, and CSS Grid's default align-items: stretch already
            stretches both of them to that row's height (the taller of the
            two sides' natural content) with no class needed for that part.
            h-full then makes the Card itself, not just its invisible
            wrapper, actually fill that stretched height, matching the same
            fix on the right below. Below lg the wrapper is a plain carousel
            page instead (see PAGE_CLASSES), where the card's own height is
            left alone, unchanged from before. */}
        <div className={PAGE_CLASSES}>
          <SettlementAnalyticsCard className="lg:h-full" />
        </div>

        {/* grow (not flex-1, whose 0 basis would force both cards to the same
            height as each other and clip the taller one) fills whatever
            height this wrapper ends up stretched to, the same role h-full
            plays on Settlement Analytics above, just expressed as a flex
            child here since this wrapper's own two cards are a flex-col
            stack rather than a single element. Together the two sides always
            end up the same total height, whichever one is naturally taller:
            below lg via the carousel's own row-direction flex (which
            stretches by the same default), from lg up via the grid. */}
        <div className={cn("flex flex-col gap-4", PAGE_CLASSES)}>
          <OutstandingAmountCard className="grow" />
          <SavedAmountCard className="grow" />
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
