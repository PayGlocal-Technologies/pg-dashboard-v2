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
import { TransactionDetailsContent } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
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
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>

        {/* Close first, then Expand: close stays the leading (primary)
            affordance, with Expand discoverable immediately beside it but
            secondary to it. */}
        <DrawerHeader className="flex shrink-0 items-center gap-1 py-3">
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
      </DrawerContent>
    </Drawer>
  );
}
