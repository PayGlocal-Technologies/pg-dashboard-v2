"use client";

import { useState } from "react";
import { Button, DataTable, StatusBadge, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { formatCurrency } from "@/lib/utils/format";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { getStatusMeta } from "@/features/dashboard/transactions/mcaColumns";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import { TRANSACTIONS_PAGE_LIMIT } from "@/features/dashboard/transactions/constants";
import type {
  McaTransaction,
  McaTransactionsResponse,
  TableReqBody,
} from "@/features/dashboard/transactions/types";

interface VirtualAccountTransactionsProps {
  /** Selected virtual account's currency — the server-side filter for this list. */
  currency: string;
  countryName: string;
}

/**
 * Recent transactions for whichever virtual account is selected in the
 * carousel above, filtered server-side by currency. Reuses the same
 * fetch/drawer/expand pattern as McaTransactionTable — just a smaller column
 * set (Amount, Settlement Status, Action) and none of that table's own
 * search/filter/tabs chrome, which doesn't belong on this compact section.
 */
export function VirtualAccountTransactions({ currency, countryName }: VirtualAccountTransactionsProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const [page, setPage] = useState(1);

  // Same three-state selection pattern as McaTransactionTable: a row click
  // opens the drawer, Expand hands the same transaction to the full page,
  // and detailsOverrideRow lets a Linked Transactions click show a
  // transaction outside this list's own fetched page.
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOverrideRow, setDetailsOverrideRow] = useState<McaTransaction | null>(null);

  const body = buildTxnRequestBody(
    { currency: [currency] },
    {
      selectedMid: midFilter,
      pageLimit: TRANSACTIONS_PAGE_LIMIT,
      from: (page - 1) * TRANSACTIONS_PAGE_LIMIT,
    }
  );

  const { data, isPending } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["mca-transactions", "virtual-account", currency, urlMid, ...(midFilter?.value ?? [])],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const rows = data?.data?.data ?? [];
  const totalCount = data?.data?.totalCount ?? 0;
  const detailsRow = detailsOverrideRow ?? rows.find((r) => r.gid === detailsRowId) ?? null;

  const openDetails = (row: McaTransaction) => {
    setDetailsOverrideRow(null);
    setDetailsRowId(row.gid);
    setDrawerOpen(true);
  };

  const expandToPage = (row: McaTransaction) => {
    setDetailsRowId(row.gid);
    setDrawerOpen(false);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsOverrideRow(null);
  };

  const openLinkedTransaction = (row: McaTransaction) => {
    setDetailsOverrideRow(row);
    setDetailsRowId(row.gid);
  };

  const columns: Column<McaTransaction>[] = [
    {
      key: "amount",
      header: "Amount",
      minWidth: 130,
      align: "right",
      render: (row) => {
        const amount = parseFloat(row.amount ?? "0");
        const rowCurrency = row.currency ?? currency;
        return (
          <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {formatCurrency(amount, rowCurrency, "en-US")}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{rowCurrency}</span>
          </div>
        );
      },
    },
    {
      key: "externalStatus",
      header: "Settlement Status",
      minWidth: 160,
      render: (row) => {
        const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
        const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
    {
      key: "action",
      header: "Action",
      minWidth: 130,
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="eye" className="h-3.5 w-3.5" />}
          onClick={() => openDetails(row)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Same in-place swap McaTransactionTable uses: Expand replaces this
  // section's own content with the full page rather than opening a new
  // route, so Account Details and the carousel above stay exactly as they were.
  if (detailsOpen && detailsRow) {
    return (
      <TransactionDetailsPage
        row={detailsRow}
        onBack={closeDetails}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    );
  }

  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Recent transactions
      </h3>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isPending}
        skeletonRows={5}
        emptyTitle="No transactions yet"
        emptyDescription={`Transactions for the ${countryName} account will appear here once received.`}
        rowKey={(row) => row.gid}
        pageSize={TRANSACTIONS_PAGE_LIMIT}
        totalRows={totalCount}
        page={page}
        onPageChange={setPage}
        tableLayout="content"
        density="compact"
      />

      <TransactionDetailsDrawer
        row={detailsRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onExpand={expandToPage}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    </section>
  );
}
