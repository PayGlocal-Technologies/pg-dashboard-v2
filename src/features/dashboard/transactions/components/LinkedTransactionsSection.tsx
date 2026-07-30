"use client";

import { DataTable } from "@/components/ui";
import { usePostQuery } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import type {
  McaTransaction,
  McaTransactionsResponse,
  TableReqBody,
} from "@/features/dashboard/transactions/types";

interface LinkedTransactionsSectionProps {
  row: McaTransaction;
  isPartnerUser: boolean;
  onOpenTransaction: (row: McaTransaction) => void;
}

const LINKED_TRANSACTIONS_LIMIT = 5;

// McaTransaction carries no parent/batch reference (unlike PA's
// TransactionDetails.linkedTransactions, which comes from a different
// endpoint entirely), so there's no real "linked transaction" foreign key to
// query on here. The closest available relationship is other transactions
// from the same remitter — found via the exact same full-text search the
// Transactions page's own Search box already uses (see
// buildTxnRequestBody's searchQuery handling), just pre-filled instead of
// typed. This reuses that existing mechanism rather than inventing a new one.
export function LinkedTransactionsSection({
  row,
  isPartnerUser,
  onOpenTransaction,
}: LinkedTransactionsSectionProps) {
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const remitterName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? undefined;

  const body = buildTxnRequestBody(
    {},
    {
      searchQuery: remitterName,
      selectedMid: midFilter,
      pageLimit: LINKED_TRANSACTIONS_LIMIT + 1,
    }
  );

  const { data, isPending } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["mca-linked-transactions", row.gid, urlMid, ...(midFilter?.value ?? [])],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady && !!remitterName
  );

  const rows = (data?.data?.data ?? [])
    .filter((r) => r.gid !== row.gid)
    .slice(0, LINKED_TRANSACTIONS_LIMIT);

  // Same columns as the Transactions page, minus Actions — a linked
  // transaction is opened by clicking the row (RowClick, baked into every
  // other column already), not via an upload/view-invoice action.
  const columns = buildMcaColumns(isPartnerUser, onOpenTransaction, { showActions: false });

  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Linked transactions
      </h3>
      <p className="mb-4 mt-1 text-[13px] text-muted-foreground">
        All transactions from the same remitter are displayed here.
      </p>
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isPending}
        skeletonRows={3}
        emptyTitle="No linked transactions"
        emptyDescription="Other transactions from this remitter will appear here."
        rowKey={(r) => r.gid}
        tableLayout="content"
        density="compact"
      />
    </section>
  );
}
