"use client";

import { useRouter } from "next/navigation";
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
import { TransactionDetailsContent } from "@/features/dashboard/pa-transactions/components/TransactionDetailsContent";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

/** The drawer's width on sm+, shared with the expand/collapse hand-off. */
export const PA_DRAWER_WIDTH_PX = 512;

/**
 * The collapsed view of a PA transaction: a right-side drawer over the
 * list, the same build as MCA Transactions' (Close and Expand together on
 * the left, the transaction ID on the right, only the body scrolls). Below
 * md it is a bottom sheet with no Expand, as there is no full-page view in
 * the mobile flow.
 */
export function TransactionDetailsDrawer({
  transaction,
  open,
  onOpenChange,
  onExpand,
  instant = false,
}: {
  transaction: PaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Grows the drawer into the full page in place (the Transactions list).
   *  Without it, Expand opens the transaction's own route instead, which is
   *  what pages that only borrow this drawer (Manage Mandates, Scheduler) get. */
  onExpand?: () => void;
  /** Skip the slide in/out while DrawerExpandMorph covers the drawer, so it
   *  can appear or vanish under the hand-off in one frame. */
  instant?: boolean;
}) {
  const { isBelow } = useBreakpoint();
  const isBottomSheet = isBelow("md");
  const router = useRouter();
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);

  // The route reads the transaction from the store, so it goes there first.
  const openRoute = () => {
    if (!transaction?.gid) return;
    setStoredTransaction(transaction);
    onOpenChange(false);
    router.push(`/pa-transactions/${encodeURIComponent(transaction.gid)}`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isBottomSheet ? "bottom" : "right"}>
      <DrawerContent
        className={cn(
          "[&>button:last-child]:hidden",
          !isBottomSheet && "w-full sm:w-[32rem] sm:max-w-[92vw]",
          instant && "data-[state=closed]:animate-none! data-[state=open]:animate-none!"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>
        {transaction && (
          <TransactionDrawerBody
            transaction={transaction}
            onClose={() => onOpenChange(false)}
            onExpand={isBottomSheet ? undefined : (onExpand ?? openRoute)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The drawer's inside, shared with the expand/collapse hand-off so the
 *  moving panel shows the real content in the real place. */
export function TransactionDrawerBody({
  transaction,
  onClose,
  onExpand,
}: {
  transaction: PaTransaction;
  onClose?: () => void;
  onExpand?: () => void;
}) {
  return (
    <>
      <DrawerHeader className="flex shrink-0 items-center gap-2 py-3">
        <div className="flex shrink-0 items-center gap-1">
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
          {onExpand && (
            <IconButton
              aria-label="Expand to full page"
              variant="ghost"
              size="sm"
              onClick={onExpand}
            >
              <Icon name="expand" className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        {transaction.gid && (
          <CopyableText
            value={transaction.gid}
            displayValue={truncateMiddle(transaction.gid, 10, 6)}
            valueClassName="min-w-0 truncate text-muted-foreground"
            className="ml-auto min-w-0"
          />
        )}
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <TransactionDetailsContent transaction={transaction} layout="drawer" />
      </div>
    </>
  );
}
