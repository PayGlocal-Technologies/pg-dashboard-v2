"use client";

import { Card, CardContent } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import { formatUsdShort } from "@/features/dashboard/transactions/components/SettlementAnalyticsCard";
import { MCA_FX_RATES_TO_INR } from "@/features/dashboard/transactions/constants";
import { OUTSTANDING_AMOUNT_USD } from "@/features/dashboard/transactions/mock-data";

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), just title,
 * amount, INR conversion, and a one-line explanation, no toggle or
 * breakdown. No info icon here by design, unlike flux-ui's own
 * MetricSparklineCard (which this deliberately doesn't use, both for that
 * reason and because its fixed p-5 padding wouldn't match Card size="sm"'s
 * px-7 py-7 next to it).
 */
export function OutstandingAmountCard() {
  const inrValue = OUTSTANDING_AMOUNT_USD * (MCA_FX_RATES_TO_INR.USD ?? 1);

  return (
    <Card size="sm" className="w-full">
      <CardContent>
        <p className="text-sm font-semibold text-foreground">Outstanding amount</p>

        <div className="mt-3">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatUsdShort(OUTSTANDING_AMOUNT_USD)}
          </p>
          {/* Secondary, derived from the USD figure and the same FX rate the
              rest of the Transactions feature uses, not a second literal. */}
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            {formatCurrency(inrValue, "INR", "en-IN")}
          </p>
        </div>

        <p className="mt-3 text-[13px] text-muted-foreground">
          Amount received from customers that is yet to be settled.
        </p>
      </CardContent>
    </Card>
  );
}
