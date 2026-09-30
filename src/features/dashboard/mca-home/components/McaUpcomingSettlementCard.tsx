"use client";

import { Button, Card, Separator, Shimmer } from "@/components/ui";
import { CompactAmount } from "@/components/common/CompactAmount";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { useSettlementUpcoming } from "@/features/dashboard/settlement-reports/hooks";
import { useSettlementDetails } from "@/features/dashboard/settings/hooks";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

/** "****1234" (whatever mask character the settlement endpoint sends) as
 *  "••••1234" — dots read as "hidden digits" more clearly than asterisks,
 *  matching how the account number is masked elsewhere (e.g. MidAvatar). */
function toDotMask(masked: string): string {
  return masked.replace(/\*/g, "•");
}

/**
 * "Upcoming settlement", split out of McaRevenueCard into its own small card
 * under Needs attention. It used to sit as a supporting strip at the bottom
 * of the performance card, but that gave the performance card a fixed-height
 * block regardless of which metric was selected — pulling it out lets that
 * card's graph use the freed space instead, and gives Needs attention a
 * fixed-height neighbour that fills the rest of the column beside it.
 *
 * The bottom line is a "Take action" link to Transactions' Invoice pending
 * tab while invoices are still needed for this settlement
 * (upcoming.pendingInvoiceCount). Otherwise it falls back to the destination
 * account
 * (useSettlementDetails, the same masked read Settings > Banking shows) —
 * this is the merchant's one real settlement account, so there's nothing to
 * fabricate or duplicate a second source of truth for.
 */

export function McaUpcomingSettlementCard() {
  const { scopeId } = useScopeId("PACB");
  const { upcoming, isLoading } = useSettlementUpcoming(scopeId);
  const { settlement } = useSettlementDetails(true);
  const maskedAccountNumber = settlement?.maskedAccountNumber;
  const router = useRouter();
  const hasPendingInvoices = !isLoading && !!upcoming && upcoming.pendingInvoiceCount > 0;

  return (
    <Card className="gap-2 p-5">
      <p className="text-xs font-medium text-muted-foreground">Upcoming settlement</p>
      {isLoading ? (
        <Shimmer className="mt-1.5 h-7 w-24" />
      ) : upcoming ? (
        <CompactAmount
          amount={upcoming.amount}
          currency="INR"
          className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums"
        />
      ) : (
        <span className="mt-1 block text-2xl font-bold tracking-tight text-foreground tabular-nums">
          —
        </span>
      )}
      {!isLoading && upcoming && upcoming.transactionCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {upcoming.transactionCount} transaction{upcoming.transactionCount === 1 ? "" : "s"} ready
          to settle
        </p>
      )}

      {hasPendingInvoices ? (
        <>
          <Separator className="my-0.5" />
          {/* Straight to the transactions still waiting on an invoice:
              Transactions opens on its "Invoice pending" tab by default (no
              ?q=), so the plain route lands there. Shown only while
              upcoming.pendingInvoiceCount says there is something to do. */}
          <Button
            type="button"
            variant="link"
            size="sm"
            rightIcon={<Icon name="arrow-right" size={13} aria-hidden />}
            onClick={() => router.push("/mca-transactions")}
            className="h-auto min-h-0 w-fit gap-1 p-0 text-xs font-semibold"
          >
            Take action
          </Button>
        </>
      ) : (
        maskedAccountNumber && (
          <>
            <Separator className="my-0.5" />
            <p className="text-xs text-muted-foreground">
              Settles to{" "}
              <span className="font-medium text-foreground">{toDotMask(maskedAccountNumber)}</span>
            </p>
          </>
        )
      )}
    </Card>
  );
}
