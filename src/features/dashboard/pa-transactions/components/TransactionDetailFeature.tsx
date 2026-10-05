"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import { TransactionDetailsPage } from "@/features/dashboard/pa-transactions/components/TransactionDetailsPage";

// The parent transaction's own page, reached by URL (a Linked Transactions
// row, a refund page's Back). The list's in-place expanded view and this are
// the same TransactionDetailsPage, so they can never drift; this one has no
// Collapse, as there is no drawer to return to.
const LIST_PATH = "/pa-transactions";
const NOT_FOUND_HINT = "Open this transaction from the Transactions list to view its details.";

interface TransactionDetailFeatureProps {
  transactionId: string;
}

export function TransactionDetailFeature({ transactionId }: TransactionDetailFeatureProps) {
  const router = useRouter();
  const transaction = useTransactionDetail((s) => s.transaction);

  if (!transaction || transaction.gid !== transactionId) {
    return (
      <div className="page-enter mx-auto max-w-350 space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon name="alert-circle" size={22} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Transaction not found</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{NOT_FOUND_HINT}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <TransactionDetailsPage transaction={transaction} onBack={() => router.push(LIST_PATH)} />
    </div>
  );
}
