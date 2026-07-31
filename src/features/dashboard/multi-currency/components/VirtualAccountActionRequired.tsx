"use client";

import { useState } from "react";
import { Button, Card, EmptyState, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ICONS } from "@/components/icon/registry";
import { usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { mcaTxnSearchApi } from "@/features/dashboard/transactions/services";
import { buildTxnRequestBody } from "@/features/dashboard/transactions/buildRequestBody";
import { getStatusMeta, isWaitingForInvoice } from "@/features/dashboard/transactions/mcaColumns";
import { TransactionDetailsPage } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { TransactionDetailsDrawer } from "@/features/dashboard/transactions/components/TransactionDetailsDrawer";
import type {
  McaTransaction,
  McaTransactionsResponse,
  TableReqBody,
} from "@/features/dashboard/transactions/types";

/** externalStatus that renders the "Invoice Pending" chip — the one status
 *  this section is about. Matches McaTransactionTable's own tab of the same
 *  name rather than re-deriving the mapping. */
const INVOICE_PENDING_STATUSES = ["DOCUMENT_PENDING"];

/** This is a compact side panel, not the full paginated table, so it fetches a
 *  single short page. The count of anything beyond it is surfaced in the
 *  footer rather than silently dropped. */
const ACTION_REQUIRED_LIMIT = 10;

interface VirtualAccountActionRequiredProps {
  /** Selected virtual account's currency — the server-side filter for this list. */
  currency: string;
  countryName: string;
}

/**
 * Invoice-pending transactions for whichever virtual account is expanded in
 * the carousel above. Reuses the same fetch/drawer/expand wiring as
 * McaTransactionTable, but renders a list rather than a table — these rows are
 * a short action queue, not tabular data to scan across columns.
 */
export function VirtualAccountActionRequired({
  currency,
  countryName,
}: VirtualAccountActionRequiredProps) {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");

  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOverrideRow, setDetailsOverrideRow] = useState<McaTransaction | null>(null);
  // Transactions whose invoice was just submitted. There's no real upload
  // endpoint yet (see UploadInvoiceForm's simulateSaveInvoice TODO), so this
  // mirrors McaTransactionTable's statusOverrides: the row leaves this queue
  // immediately instead of lingering until a refetch that wouldn't change it.
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);

  const body = buildTxnRequestBody(
    { currency: [currency], externalStatus: INVOICE_PENDING_STATUSES },
    {
      selectedMid: midFilter,
      pageLimit: ACTION_REQUIRED_LIMIT,
      from: 0,
    }
  );

  const { data, isPending } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["mca-transactions", "action-required", currency, urlMid, ...(midFilter?.value ?? [])],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    isReady
  );

  const fetched = data?.data?.data ?? [];
  // The status filter above is server-side, but isWaitingForInvoice is what
  // actually decides whether the "Invoice Pending" chip shows: an
  // FRM-pending row reads "Action Required" instead and belongs to a
  // different flow, so it's excluded here too.
  const rows = fetched.filter((r) => isWaitingForInvoice(r) && !uploadedIds.includes(r.gid));
  const totalCount = data?.data?.totalCount ?? 0;
  const hiddenCount = Math.max(0, totalCount - fetched.length);

  const detailsRow = detailsOverrideRow ?? rows.find((r) => r.gid === detailsRowId) ?? null;

  // "Upload Invoice" opens the details drawer, whose inline upload form is the
  // current upload flow — the same handoff the Transactions table's own
  // Upload Invoice button performs.
  const openUploadFlow = (row: McaTransaction) => {
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

  const handleInvoiceSubmitted = (row: McaTransaction) => {
    setUploadedIds((prev) => (prev.includes(row.gid) ? prev : [...prev, row.gid]));
  };

  // Same in-place swap McaTransactionTable uses: Expand replaces this
  // section's own content rather than opening a new route, so the carousel and
  // Account Details beside it stay exactly as they were.
  if (detailsOpen && detailsRow) {
    return (
      <TransactionDetailsPage
        row={detailsRow}
        onBack={closeDetails}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    );
  }

  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Action required
      </h3>

      {/* gap-0 p-0 overrides Card's generous default padding/gap — rows own
          their own padding so the dividers between them run edge to edge. */}
      <Card className="gap-0 p-0">
        {isPending ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 space-y-2">
                  <Shimmer className="h-4 w-40" rounded="sm" />
                  <Shimmer className="h-3 w-52" rounded="sm" />
                </div>
                <Shimmer className="h-8 w-28 shrink-0" rounded="md" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ICONS["check-circle"]}
            title="No pending actions"
            description={`Nothing needs an invoice for the ${countryName} account right now.`}
          />
        ) : (
          <>
            {rows.map((row, index) => {
              const amount = parseFloat(row.amount ?? "0");
              const rowCurrency = row.currency ?? currency;
              const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, false);
              const remitter =
                row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? null;

              return (
                <div key={row.gid}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      {/* Amount leads, with the status chip inline beside it */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold tabular-nums text-foreground">
                          {formatCurrency(amount, rowCurrency, "en-US")}
                        </span>
                        <StatusBadge
                          variant={variant}
                          label={label}
                          trailIcon={trailIcon}
                          size="sm"
                        />
                      </div>
                      {/* Secondary line: when it happened and who sent it */}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatTransactionTimestamp(row.formattedCreationDateTime)}
                        {remitter && <> &bull; {remitter}</>}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
                      onClick={() => openUploadFlow(row)}
                    >
                      Upload Invoice
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Never silently truncate — say so when the queue runs longer
                than this panel shows. */}
            {hiddenCount > 0 && (
              <>
                <Separator />
                <p className="px-4 py-2.5 text-xs text-muted-foreground">
                  Showing {fetched.length} of {totalCount}. See the Transactions page for the rest.
                </p>
              </>
            )}
          </>
        )}
      </Card>

      <TransactionDetailsDrawer
        row={detailsRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onExpand={expandToPage}
        onUploaded={handleInvoiceSubmitted}
        onOpenTransaction={openLinkedTransaction}
        isPartnerUser={isPartnerUser}
      />
    </section>
  );
}
