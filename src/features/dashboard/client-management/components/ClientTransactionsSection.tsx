"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui";
import { buildMcaColumns } from "@/features/dashboard/transactions/mcaColumns";
import { TransactionCardList } from "@/features/dashboard/transactions/components/TransactionCardList";
import { clientTransactions } from "@/features/dashboard/client-management/mock-data";
import { CLIENT_TRANSACTIONS_PAGE_LIMIT } from "@/features/dashboard/client-management/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface ClientTransactionsSectionProps {
  /** The client's business name — the remitter these transactions belong to,
   *  and the only thing that selects them (see clientTransactions). */
  businessName: string;
  isPartnerUser: boolean;
  /** Opens the existing Transaction Details drawer for the clicked row. */
  onOpenTransaction: (row: McaTransaction) => void;
}

/**
 * One client's transactions, rendered through the Transactions page's own
 * columns (buildMcaColumns) and mobile card list (TransactionCardList) rather
 * than a second table built for this page — so status chips, currency and flag
 * treatment, row height, typography, clickable rows, and the lg breakpoint
 * where the table becomes cards are all inherited, not reproduced.
 *
 * The Actions column is dropped (showActions: false), the same way the
 * Transaction Details page's own embedded table drops it: an Upload/View
 * Invoice CTA belongs on the Transactions page, not inside another record's
 * detail view. Every remaining cell is still a click target, so the whole row
 * opens the transaction exactly as it does there.
 */
export function ClientTransactionsSection({
  businessName,
  isPartnerUser,
  onOpenTransaction,
}: ClientTransactionsSectionProps) {
  const [page, setPage] = useState(1);

  // Filtered by business name only — a client's transactions are the ones
  // remitted in its name, and no others.
  const rows = clientTransactions(businessName);

  const totalCount = rows.length;
  // Clamped during render (rather than reset from a handler) so the page can
  // never point past the end, the same guard the client table itself uses.
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENT_TRANSACTIONS_PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (safePage - 1) * CLIENT_TRANSACTIONS_PAGE_LIMIT,
    safePage * CLIENT_TRANSACTIONS_PAGE_LIMIT
  );

  const columns = buildMcaColumns(isPartnerUser, onOpenTransaction, { showActions: false });

  const emptyTitle = "No transactions yet";
  const emptyDescription = `Transactions remitted by ${businessName} will appear here`;

  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Transactions
      </h3>
      {/* Same bordered surface the Transactions page wraps its own table in,
          with DataTable's border/radius neutralised since this wrapper draws
          them. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTable
          className="hidden rounded-none border-0 lg:block"
          columns={columns}
          data={pageRows}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          rowKey={(row) => row.gid}
          pageSize={CLIENT_TRANSACTIONS_PAGE_LIMIT}
          totalRows={totalCount}
          page={safePage}
          onPageChange={setPage}
          tableLayout="content"
          density="compact"
        />

        <TransactionCardList
          className="lg:hidden"
          rows={pageRows}
          isLoading={false}
          onOpenDetails={onOpenTransaction}
          page={safePage}
          onPageChange={setPage}
          totalRows={totalCount}
          pageSize={CLIENT_TRANSACTIONS_PAGE_LIMIT}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
    </section>
  );
}
