import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { buildPaColumns } from "@/features/dashboard/pa-transactions/columns";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

const LINKED_COLUMNS = buildPaColumns({ isPartnerUser: false });

interface LinkedTransactionsSectionProps {
  transactions: PaTransaction[];
  onViewDetails: (row: PaTransaction) => void;
}

/** Shared by TransactionDetailsDrawer and TransactionDetailFeature so the
 * "other transactions from this customer" list, and its illustrated empty
 * state, always look identical in both places. */
export function LinkedTransactionsSection({ transactions, onViewDetails }: LinkedTransactionsSectionProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-4 py-8 text-center">
        <Icon name="no-transactions-illustration" className="h-28 w-28" />
        <h3 className="text-sm font-semibold text-foreground">No linked transactions</h3>
        <p className="text-xs text-muted-foreground">Other transactions from this customer will appear here.</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={LINKED_COLUMNS}
      data={transactions}
      rowKey={(row) => row.gid ?? ""}
      density="compact"
      tableLayout="content"
      footerSummary="count"
      rowAction={(row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(row)}
          rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
          className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
        >
          View details
        </Button>
      )}
    />
  );
}
