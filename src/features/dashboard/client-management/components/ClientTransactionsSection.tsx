"use client";

import { useState } from "react";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  buildMcaColumns,
  isWaitingForInvoice,
} from "@/features/dashboard/mca-transactions/columns";
import { TransactionCardList } from "@/features/dashboard/mca-transactions/components/TransactionCardList";
import { clientTransactions } from "@/features/dashboard/client-management/mock-data";
import { CLIENT_TRANSACTIONS_PAGE_LIMIT } from "@/features/dashboard/client-management/constants";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

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
 * Transaction Details page's own embedded table drops it. In its place, a row
 * still waiting on an invoice offers Upload Invoice through DataTable's own
 * `rowAction` slot — revealed on hover (and on keyboard focus within the row,
 * which the same slot handles) rather than occupying a column of its own. Every
 * other cell is still a click target, so the whole row opens the transaction
 * exactly as it does on the Transactions page.
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

  // buildMcaColumns takes the whole RowActionHandlers set, but showActions:
  // false drops the Actions column before it is ever rendered (see the filter
  // buildMcaColumns returns), so only onOpenDetails is reachable from here —
  // every cell's own RowClick uses it. The row-menu handlers below exist to
  // satisfy the type; nothing in this section can invoke them. canManageInvoices
  // is false for the same reason: it only gates entries in that dropped menu.
  const columns = buildMcaColumns(
    isPartnerUser,
    {
      onOpenDetails: onOpenTransaction,
      onDownloadFirc: () => {},
      onCreateInvoice: () => {},
      onLinkInvoice: () => {},
      canManageInvoices: false,
    },
    { showActions: false }
  );

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
          // Per row, so only the ones actually waiting on an invoice offer the
          // action; returning null leaves every other row with nothing to
          // reveal. Same button treatment as the Transactions table's own
          // Upload Invoice cell, so the two read as one control in two places.
          rowAction={(row) =>
            isWaitingForInvoice(row) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="upload" className="w-3 h-3" />}
                onClick={(e) => {
                  // The action floats over the row, so without this the click
                  // would also open the row underneath it. Here they happen to
                  // lead to the same place — the drawer's inline upload flow —
                  // but that's a coincidence worth not relying on.
                  e.stopPropagation();
                  onOpenTransaction(row);
                }}
                className="h-auto min-h-0 gap-1 rounded-md bg-card px-2 py-1 text-[11px] whitespace-nowrap shadow-sm"
              >
                Upload Invoice
              </Button>
            ) : null
          }
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
