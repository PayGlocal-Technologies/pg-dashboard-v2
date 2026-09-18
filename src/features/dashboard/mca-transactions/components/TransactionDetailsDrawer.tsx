"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  VisuallyHidden,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import { truncateMiddle } from "@/lib/utils/format";
import { TransactionDetailsContent } from "@/features/dashboard/mca-transactions/components/TransactionDetailsPage";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";
import { GuideTour } from "@/components/common/guide/GuideTour";
import { isGuideCompleted, markGuideCompleted } from "@/components/common/guide/storage";
import {
  TXN_DETAIL_GUIDE_KEY,
  TXN_DETAIL_GUIDE_STEPS,
} from "@/features/dashboard/mca-transactions/guide";

interface TransactionDetailsDrawerProps {
  row: McaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full-page view for the same transaction. */
  onExpand: (row: McaTransaction) => void;
  onUploaded?: (row: McaTransaction) => void;
  onOpenTransaction: (row: McaTransaction) => void;
  isPartnerUser: boolean;
}

export function TransactionDetailsDrawer({
  row,
  open,
  onOpenChange,
  onExpand,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
}: TransactionDetailsDrawerProps) {
  // Below md this becomes a bottom sheet instead of a right-side drawer, via
  // flux-ui's own Drawer side="bottom" (which supplies the inset-x-0/bottom-0
  // placement, the rounded-t-2xl top corners, the max-h-[85vh] cap, and the
  // slide-in-from-bottom animation) rather than a second component. Tablet
  // (md) and desktop keep the right-side drawer exactly as before.
  //
  // A breakpoint read here can't cause a hydration mismatch: with open=false
  // Radix renders no portal and no content at all, so `side` has no effect on
  // the DOM until a row is clicked, which is client-only by definition.
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");

  // Contextual coach-mark: runs once, the first time a merchant opens the drawer
  // on desktop (the expand action it points at doesn't exist on the bottom
  // sheet). No launcher button here — the drawer is transient, so the tour is
  // tied to the open event instead.
  //
  // Held back until the drawer has finished sliding in (~550ms) rather than
  // firing on the same frame: opening the tour while the panel is still
  // animating in made the spotlight pop up abruptly over a moving surface.
  // Waiting lets the drawer settle, then the dim/card fade in on their own.
  // setState lives in the timeout callback, per the purity lint rules.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (!open || isBottomSheet) return;
    const id = setTimeout(() => {
      if (!isGuideCompleted(TXN_DETAIL_GUIDE_KEY)) setTourOpen(true);
    }, 550);
    return () => clearTimeout(id);
  }, [open, isBottomSheet]);

  function closeTour() {
    markGuideCompleted(TXN_DETAIL_GUIDE_KEY);
    setTourOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      {/*
        Two overrides on the shared DrawerContent, both deliberate:

        - Width. The content renders single-column here (see the "drawer"
          layout passed to TransactionDetailsContent below), so it doesn't
          need the full two-column page's width, just wide enough for a
          comfortable single reading column. Both of the default's classes
          (w-80 sm:w-96) have to be overridden, not just one, since sm:w-96
          would otherwise still apply from sm up; capped against the
          viewport so it never exceeds it on narrow screens.
        - [&>button:last-child]:hidden. DrawerContent always appends its own
          close button pinned to the top-right corner. This header puts close
          on the far left (with Expand beside it), so that built-in one is
          hidden rather than reimplementing the drawer to omit it. It's the
          last direct child, after the children passed in here.
      */}
      {/* No "relative" here: DrawerContent's base class is already `fixed`
          (see flux-ui's drawer.tsx), and cn()/twMerge treats "relative" as a
          conflicting position utility, silently dropping "fixed" in favor of
          whichever comes later in the merge. That regression made the whole
          drawer lose its fixed positioning (and with it, its slide-in
          animation and inset-y-0/right-0/h-full sizing), so only the overlay
          rendered. "fixed" alone already establishes a containing block for
          the feedback sheet's `absolute` positioning below, so no extra
          position class is needed here at all. */}
      {/* The width overrides apply to the right-side drawer only: as a bottom
          sheet the content already spans the full width via side="bottom"'s
          own inset-x-0/w-full, and sm:w-[32rem] would otherwise still narrow
          it between sm and md, where this is still a sheet. */}
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>

        {/* Close and Expand stay grouped together on the left, adjacent to
            one another, same interactions as before. Transaction ID moves to
            the far right instead (see CopyableText below): value only, no
            label, secondary colour/size so it stays subordinate to the two
            actions across from it, with the existing copy icon and
            copied-feedback reused as-is rather than rebuilt. ml-auto on the
            CopyableText (not justify-between on the row) keeps Close/Expand
            pinned left even when row is momentarily null, e.g. mid
            close-animation, since there's nothing to push right at that
            point. */}
        <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              aria-label="Close"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <Icon name="x" className="h-4 w-4" />
            </IconButton>
            {/* Not rendered at all as a bottom sheet (rather than hidden with
                a class): there is no expanded view in the mobile flow, which
                is card to sheet and back, so the action has nothing to point
                at there. Close stays the only way out, same interaction as
                everywhere else. */}
            {!isBottomSheet && (
              <span data-guide="mca-txn-detail-expand" className="inline-flex">
                <IconButton
                  aria-label="Expand to full page"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (row) onExpand(row);
                  }}
                >
                  <Icon name="expand" className="h-4 w-4" />
                </IconButton>
              </span>
            )}
          </div>
          {row && (
            <CopyableText
              value={row.gid}
              displayValue={truncateMiddle(row.gid, 10, 6)}
              valueClassName="min-w-0 truncate text-muted-foreground"
              className="ml-auto min-w-0"
            />
          )}
        </DrawerHeader>

        {/* Only this region scrolls, so the header's close/expand stay
            reachable however long the content runs. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {row && (
            <TransactionDetailsContent
              row={row}
              onUploaded={onUploaded}
              onOpenTransaction={onOpenTransaction}
              isPartnerUser={isPartnerUser}
              layout="drawer"
            />
          )}
        </div>

        {/* First-open coach-mark pointing at the expand-to-full-page action. */}
        <GuideTour steps={TXN_DETAIL_GUIDE_STEPS} open={tourOpen} onClose={closeTour} />
      </DrawerContent>
    </Drawer>
  );
}
