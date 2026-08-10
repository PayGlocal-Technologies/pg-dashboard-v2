"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import {
  TransactionDetailsContent,
  isSettledTransaction,
} from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { SettlementFeedbackSheet } from "@/features/dashboard/transactions/components/SettlementFeedbackSheet";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface TransactionDetailsDrawerProps {
  row: McaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full-page view for the same transaction. */
  onExpand: (row: McaTransaction) => void;
  onUploaded?: (row: McaTransaction) => void;
  onOpenTransaction: (row: McaTransaction) => void;
  isPartnerUser: boolean;
  /** Transaction gids whose settlement feedback has already been submitted
   *  or dismissed. Lifted up to the shared parent (McaTransactionTable)
   *  rather than owned here, since this drawer and TransactionDetailsPage
   *  are separate component instances that swap in and out of the tree on
   *  Expand/Collapse. State owned locally by either one would be lost the
   *  moment the other took over. */
  resolvedFeedbackIds: Set<string>;
  /** Marks a transaction's feedback as resolved in that shared set. */
  onFeedbackResolved: (gid: string) => void;
}

export function TransactionDetailsDrawer({
  row,
  open,
  onOpenChange,
  onExpand,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
  resolvedFeedbackIds,
  onFeedbackResolved,
}: TransactionDetailsDrawerProps) {
  const showFeedback = open && !!row && isSettledTransaction(row);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
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
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
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
          </div>
          {row && (
            <CopyableText value={row.gid} valueClassName="text-muted-foreground" className="ml-auto" />
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

        {/* Floats above the content above (absolute against DrawerContent's
            fixed positioning) rather than reserving its own layout space, so
            it reads as a temporary overlay, not part of the drawer's
            document flow. Settled transactions only (see isSettledTransaction).
            key={row.gid} gives each transaction its own mount, and
            alreadyResolved (backed by the shared resolvedFeedbackIds prop)
            keeps it from reappearing once resolved from either this drawer
            or the expanded page for the same transaction. */}
        {showFeedback && (
          <SettlementFeedbackSheet
            key={row.gid}
            alreadyResolved={resolvedFeedbackIds.has(row.gid)}
            onResolve={() => onFeedbackResolved(row.gid)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
