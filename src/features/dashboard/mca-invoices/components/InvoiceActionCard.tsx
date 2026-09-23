"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, CardContent, Shimmer } from "@/components/ui";
import { CompactAmount } from "@/components/common/CompactAmount";
import {
  useDocumentPending,
  useDocumentPendingTransactions,
} from "@/features/dashboard/mca-transactions/hooks";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { LinkInvoiceModal } from "@/features/dashboard/mca-transactions/components/LinkInvoiceModal";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

/** Largest first, so the three rows this card has room for are the invoices
 *  unblocking the most money rather than whichever three the search returned
 *  first. The ranking runs client-side over the pool
 *  useDocumentPendingTransactions fetches, and compares raw amounts across
 *  currencies — see that hook's KNOWN LIMITATION before treating this list as
 *  a true "biggest three". */
const MAX_ROWS = 3;

/**
 * Companion to InvoiceSummaryCards: the same "amount already collected but not
 * yet invoiced" figure OutstandingAmountCard shows on the Transactions page —
 * reusing its endpoint (`useDocumentPending`) rather than a second one — but
 * framed as a call to action on the Invoice Management page rather than a
 * passive KPI: "raise the invoices that unblock this" instead of just "here's
 * a number".
 *
 * "ytd" timeframe: this card isn't wired to the page's own period control
 * (InvoiceSummaryCards' TimeRangeTabs already scopes the counts beside it) —
 * document-pending is a current-balance figure, not something a historical
 * window applies to, matching how Outstanding Amount treats it elsewhere.
 *
 * Below the headline, up to MAX_ROWS individual document-pending transactions
 * replace what used to be a single generic "Create invoices" button — each row
 * is a specific transaction the merchant can act on directly, highest amount
 * first. Fewer than MAX_ROWS rows stretch to fill the same reserved block
 * (flex-1 per row, same technique InvoiceSummaryCards' legend uses) so the
 * card's own height never depends on how many are waiting.
 */
export function InvoiceActionCard({ className }: { className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { documentPending, isLoading } = useDocumentPending("ytd");
  const { transactions, isLoading: rowsLoading } = useDocumentPendingTransactions();
  const { selectMid } = usePacbMidScope();
  const [linkingTxn, setLinkingTxn] = useState<McaTransaction | null>(null);

  const amount = documentPending?.amount ?? 0;
  const displayCurrency = documentPending?.reportingCurrency ?? "INR";
  const pendingCount = documentPending?.count ?? 0;
  const rows = transactions.slice(0, MAX_ROWS);

  const handleCreateInvoice = (merchantId: string, gid: string) => {
    if (merchantId) selectMid(merchantId);
    router.push(`/create-invoice?gid=${gid}`);
  };

  const handleLinked = () => {
    // Linking moves the transaction off DOCUMENT_PENDING, so both this
    // card's own headline and its row list have to refetch — neither key
    // is among LinkInvoiceModal's own INVOICE_DATA_KEYS invalidation,
    // since those describe the invoice list, not this document-pending view.
    queryClient.invalidateQueries({ queryKey: ["mca-document-pending"] });
    queryClient.invalidateQueries({ queryKey: ["mca-document-pending-transactions"] });
  };

  return (
    <Card size="sm" className={className}>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-foreground">Waiting on documents from you</p>
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
          <Shimmer className="mt-2 h-9 w-32" />
        ) : (
          <CompactAmount
            amount={amount}
            currency={displayCurrency}
            className="mt-2 block text-3xl font-semibold tabular-nums tracking-tight text-foreground"
          />
        )}

        {/* mt-auto, not mt-4: this card is stretched to the donut card's
            height beside it (the grid row is `items-stretch`), and whatever
            slack that leaves collects here — above the row list — rather
            than stranding a void under it. Same mt-auto-over-fixed-margin
            technique OutstandingAmountCard uses to ground its own bottom
            block. flex-1 on the list itself is what then lets fewer rows
            grow to fill that reserved space instead of shrinking the card. */}
        <div className="mt-auto flex flex-1 flex-col border-t border-border pt-3">
          {rowsLoading ? (
            <div className="flex flex-1 flex-col divide-y divide-border">
              {Array.from({ length: MAX_ROWS }).map((_, i) => (
                <div key={i} className="flex flex-1 items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 space-y-1.5">
                    <Shimmer className="h-3.5 w-28" />
                    <Shimmer className="h-4 w-20" />
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Shimmer className="h-7 w-24 rounded-md" />
                    <Shimmer className="h-7 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="flex flex-1 items-center text-[13px] leading-relaxed text-muted-foreground">
              You&apos;re all caught up! Start creating invoices to collect payments globally.
            </p>
          ) : (
            <ul className="flex flex-1 flex-col divide-y divide-border">
              {rows.map((row) => (
                <li key={row.gid} className="flex flex-1 items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.partnerMaskedCustomerFullName || row.gid}
                    </p>
                    <CompactAmount
                      amount={parseFloat(row.amount)}
                      currency={row.currency}
                      className="text-sm tabular-nums text-muted-foreground"
                    />
                  </div>

                  {/* Neither button is solid-filled: a solid primary blue
                      repeated three times down one card reads as three
                      competing "most important thing on the page" signals,
                      which is too loud for a row-level action. text-primary
                      is what still marks Create as the row's default action
                      over Link, without the heavy fill. */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md border-primary/30 px-2.5 text-xs font-medium text-primary hover:bg-primary/5"
                      onClick={() => handleCreateInvoice(row.merchantId, row.gid)}
                    >
                      Create invoice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md px-2.5 text-xs font-medium"
                      onClick={() => setLinkingTxn(row)}
                    >
                      Link invoice
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
