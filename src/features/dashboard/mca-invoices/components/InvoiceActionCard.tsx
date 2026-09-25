"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardContent, Shimmer } from "@/components/ui";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useDocumentPendingTransactions } from "@/features/dashboard/mca-transactions/hooks";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { LinkInvoiceModal } from "@/features/dashboard/mca-transactions/components/LinkInvoiceModal";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import type {
  DocumentPendingListRow,
  DocumentPendingTimeframe,
  LinkableTransaction,
} from "@/features/dashboard/mca-transactions/types";

/** How many rows the card has room for, and so the page size it asks the API
 *  for — the server ranks by amount descending, so these are the invoices
 *  unblocking the most money rather than whichever the search returned first. */
const MAX_ROWS = 3;

/** document-pending-list carries only what a row needs, which is a different
 *  shape from the OpenSearch record LinkInvoiceModal was originally written
 *  against: `amount` arrives as a number and `createdTime` as raw ISO. */
function toLinkable(row: DocumentPendingListRow): LinkableTransaction {
  return {
    gid: row.gid,
    merchantId: row.merchantId,
    amount: String(row.amount),
    currency: row.currency,
    partnerCustomerFullName: row.customerName,
    formattedTransactionCreationDateTime: formatTransactionTimestamp(row.createdTime),
  };
}

/** "glme3703...e297" — enough of each end to spot a specific transaction
 *  without spelling out the full gid on a row that's mostly amount/actions.
 *  CSS `truncate` on the wrapping span still shortens this further if the
 *  row runs out of room, so this fixed cut is the floor, not the only one. */
function truncateGid(gid: string, headLen = 8, tailLen = 4): string {
  if (gid.length <= headLen + tailLen + 3) return gid;
  return `${gid.slice(0, headLen)}...${gid.slice(-tailLen)}`;
}

/**
 * Companion to InvoiceSummaryCards: the "amount already collected but not yet
 * invoiced" figure OutstandingAmountCard also shows on the Transactions page,
 * but framed as a call to action on the Invoice Management page rather than a
 * passive KPI: "raise the invoices that unblock this" instead of just "here's
 * a number".
 *
 * Headline and rows come from ONE call — document-pending-list returns the
 * aggregate amount/count for its window alongside the transactions in it — so
 * the figure can never describe a different period from the rows beneath it.
 * That is what it used to do: the headline was a separate, `ytd`-scoped
 * document-pending call while the rows were unscoped.
 *
 * `timeframe` is the page's own period tabs, which therefore now scope both
 * cards in this row rather than only the counts beside it.
 *
 * Below the headline, up to MAX_ROWS individual document-pending transactions
 * replace what used to be a single generic "Create invoices" button — each row
 * is a specific transaction the merchant can act on directly, highest amount
 * first. Fewer than MAX_ROWS rows leave the rest of the same reserved block
 * to a trailing spacer (see below) so the card's own height never depends on
 * how many are waiting.
 */
export function InvoiceActionCard({
  timeframe,
  className,
}: {
  timeframe: DocumentPendingTimeframe;
  className?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    transactions: rows,
    amount,
    count: pendingCount,
    reportingCurrency,
    isLoading,
  } = useDocumentPendingTransactions({ sortBy: "AMOUNT", limit: MAX_ROWS, timeframe });
  const { selectMid } = usePacbMidScope();
  const [linkingTxn, setLinkingTxn] = useState<LinkableTransaction | null>(null);

  const displayCurrency = reportingCurrency ?? "INR";

  const handleCreateInvoice = (merchantId: string, gid: string) => {
    if (merchantId) selectMid(merchantId);
    router.push(`/create-invoice?gid=${gid}`);
  };

  const handleLinked = () => {
    // Linking moves the transaction off DOCUMENT_PENDING, so this card has to
    // refetch — one key now, since the headline and the rows share a query.
    // It is not among LinkInvoiceModal's own INVOICE_DATA_KEYS invalidation,
    // which describes the invoice list rather than this document-pending view.
    queryClient.invalidateQueries({ queryKey: ["mca-document-pending-transactions"] });
  };

  return (
    <Card size="sm" className={className}>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-foreground">Invoices required</p>
            {!isLoading && pendingCount > 0 && (
              <Badge variant="secondary" size="sm" className="shrink-0">
                {pendingCount.toLocaleString("en-IN")} transaction{pendingCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {/* Lands on /mca-transactions' own default: no `q` in the URL means
              its status filter already starts on Invoice Pending, so nothing
              extra needs passing through. */}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto min-h-0 shrink-0 p-0 text-xs font-semibold"
            onClick={() => router.push("/mca-transactions")}
          >
            View all
          </Button>
        </div>

        {isLoading ? (
          <Shimmer className="mt-2 mb-4 h-9 w-32" />
        ) : (
          <CompactAmount
            amount={amount}
            currency={displayCurrency}
            // mb-4 guarantees a real gap before the divider below —
            // mt-auto on that divider's own wrapper only distributes
            // whatever slack this card's height-matching leaves over, which
            // can resolve close to 0 and left the divider crowding the
            // amount above it.
            className="mt-2 mb-4 block text-3xl font-semibold tabular-nums tracking-tight text-foreground"
          />
        )}

        {/* mt-auto, not mt-4: this card is stretched to the donut card's
            height beside it (the grid row is `items-stretch`), and whatever
            slack that leaves collects here — above the row list — rather
            than stranding a void under it. Same mt-auto-over-fixed-margin
            technique OutstandingAmountCard uses to ground its own bottom
            block. flex-1 on the list itself, plus the trailing spacer inside
            it (below), is what then lets extra reserved space collect below
            the rows themselves instead of stretching each row's own padding
            — a `flex-1` on every `<li>` used to distribute that slack across
            all three rows individually, which read as loosely padded rows
            rather than a compact list with room left over underneath. */}
        <div className="mt-auto flex flex-1 flex-col border-t border-border pt-3">
          {isLoading ? (
            <div className="flex flex-1 flex-col divide-y divide-border">
              {Array.from({ length: MAX_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2">
                  <Shimmer className="h-4 w-40" />
                  <div className="flex shrink-0 gap-3">
                    <Shimmer className="h-3.5 w-20" />
                    <Shimmer className="h-3.5 w-16" />
                  </div>
                </div>
              ))}
              <div className="flex-1" />
            </div>
          ) : rows.length === 0 ? (
            <p className="flex flex-1 items-center text-[13px] leading-relaxed text-muted-foreground">
              You&apos;re all caught up! Start creating invoices to collect payments globally.
            </p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.gid} className="flex items-center justify-between gap-3 py-2">
                    {/* Single line, not stacked: amount carries the weight
                        (font-semibold), the id/currency trail it as muted
                        secondary text. min-w-0 + truncate on the trailing
                        span is what lets this shrink gracefully at narrow
                        widths instead of colliding with the actions — the
                        browser's own ellipsis takes over once there's less
                        room than the fixed head/tail cut already gives it. */}
                    <div className="flex min-w-0 flex-1 items-center gap-x-2">
                      {/* BACKEND GAP: the design puts the remitter's country
                          flag (CountryFlagAvatar, resolved through useApp's
                          countryCurrencyMap the way the transactions table's
                          CountryCell does) before the amount. document-pending-list
                          rows carry no country, so there is nothing to draw
                          until the endpoint adds one. */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <CompactAmount
                          amount={row.amount}
                          currency={row.currency}
                          className="text-sm font-semibold tabular-nums text-foreground"
                        />
                      </div>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {row.customerName || truncateGid(row.gid)}
                      </span>
                    </div>

                    {/* Link invoice stays a plain text link (variant="link",
                        no border/background/shadow) — it's the secondary
                        action. Create invoice is now the filled primary CTA,
                        same compact pill shape McaTransactionTable's Refresh
                        button uses (h-auto min-h-0 py-1), just on
                        variant="primary" for the blue fill instead of
                        outline. Order swapped to put the primary action last,
                        closest to the row's trailing edge. */}
                    <div className="flex shrink-0 items-center gap-2.5">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto min-h-0 p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => setLinkingTxn(toLinkable(row))}
                      >
                        Link invoice
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="h-auto min-h-0 shrink-0 py-1 text-xs font-medium"
                        onClick={() => handleCreateInvoice(row.merchantId, row.gid)}
                      >
                        Create invoice
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
            </>
          )}
        </div>
      </CardContent>

      <LinkInvoiceModal
        transaction={linkingTxn}
        onOpenChange={(open) => !open && setLinkingTxn(null)}
        onLinked={handleLinked}
      />
    </Card>
  );
}
