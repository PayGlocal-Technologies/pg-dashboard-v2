"use client";

import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SAVED_AMOUNT_INR_LABEL } from "@/features/dashboard/transactions/mock-data";

/**
 * Single-KPI card stacked below OutstandingAmountCard, forming a secondary
 * analytics column beside SettlementAnalyticsCard. Same Card size/border/
 * radius/typography as its siblings (label above value), deliberately with
 * nothing else on it: no chart, no secondary metric, no toggle.
 */
export function SavedAmountCard({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardContent>
        <p className="text-sm font-semibold text-foreground">Saved amount</p>
        <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {SAVED_AMOUNT_INR_LABEL}
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Amount saved on transaction fees through PayGlocal.
        </p>
      </CardContent>
    </Card>
  );
}
