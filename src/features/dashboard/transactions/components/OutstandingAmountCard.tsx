"use client";

import { Card, CardContent, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import { formatUsdShort } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { MCA_FX_RATES_TO_INR } from "@/features/dashboard/transactions/constants";
import {
  OUTSTANDING_AMOUNT_USD,
  PENDING_TRANSACTIONS_COUNT,
} from "@/features/dashboard/transactions/mock-data";

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), just title,
 * amount, a pending-count badge, INR conversion, and a one-line explanation,
 * no toggle or per-account breakdown. No info icon here by design, unlike
 * flux-ui's own MetricSparklineCard (which this deliberately doesn't use,
 * both for that reason and because its fixed p-5 padding wouldn't match
 * Card size="sm"'s px-7 py-7 next to it).
 */
export function OutstandingAmountCard() {
  const inrValue = OUTSTANDING_AMOUNT_USD * (MCA_FX_RATES_TO_INR.USD ?? 1);

  return (
    <Card size="sm" className="w-full">
      <CardContent>
        <p className="text-sm font-semibold text-foreground">Outstanding amount</p>

        {/* Primary KPI (left) and the pending-transactions count (right),
            same row, items-start so the compact badge sits near the top of
            the row rather than centering against the much taller figure
            beside it.

            flex-wrap lets the badge drop onto its own line once the row is
            too narrow to hold both. Without it the badge's shrink-0 would
            hold its width and squeeze the amount instead — and the amount is
            the one element on this card that must never be compressed. On its
            own line justify-between leaves it flush left, under the amount,
            and gap-2 supplies the 8px between the two rows. */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatUsdShort(OUTSTANDING_AMOUNT_USD)}
          </p>
          <Badge variant="secondary" size="sm" className="shrink-0">
            {PENDING_TRANSACTIONS_COUNT} pending transactions
          </Badge>
        </div>

        {/* Secondary, derived from the USD figure and the same FX rate the
            rest of the Transactions feature uses, not a second literal. */}
        <p className="mt-2 text-sm tabular-nums text-muted-foreground">
          {formatCurrency(inrValue, "INR", "en-IN")}
        </p>

        <p className="mt-3 text-[13px] text-muted-foreground">
          Amount received from customers that is yet to be settled.
        </p>
      </CardContent>
    </Card>
  );
}
