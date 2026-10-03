"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { TransactionDetailsContent } from "@/features/dashboard/pa-transactions/components/TransactionDetailsContent";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

/**
 * The expanded view of a PA transaction, in place of the list (the same
 * pattern as MCA Transactions' details page): Back to the list and, when it
 * came from the drawer, Collapse back into it, then the two-column details.
 */
export function TransactionDetailsPage({
  transaction,
  onBack,
  onCollapse,
  decorative = false,
}: {
  transaction: PaTransaction;
  /** See TransactionDetailsContent's own. */
  decorative?: boolean;
  onBack: () => void;
  /** Omitted when the page was opened directly (a link), with no drawer to
   *  return to. */
  onCollapse?: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="pl-0 text-primary hover:text-primary-hover"
        >
          Back to Transactions
        </Button>
        {onCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="shrink" className="h-4 w-4" />}
            onClick={onCollapse}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse
          </Button>
        )}
      </div>
      <TransactionDetailsContent transaction={transaction} layout="page" decorative={decorative} />
    </div>
  );
}
