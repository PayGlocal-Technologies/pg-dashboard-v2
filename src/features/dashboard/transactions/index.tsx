"use client";

import { useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { MidGuard } from "@/components/common/MidGuard";
import { PaTransactionTable } from "@/features/dashboard/transactions/components/PaTransactionTable";
import { McaTransactionTable } from "@/features/dashboard/transactions/components/McaTransactionTable";
import {
  SEGMENT_PA,
  SEGMENT_MCA,
  PA_PRODUCT_FLAGS,
} from "@/features/dashboard/transactions/constants";

const SEGMENTS = [
  { value: SEGMENT_PA,  label: "Payment Gateway" },
  { value: SEGMENT_MCA, label: "Multi-Currency Accounts" },
] as const;

export function TransactionsFeature() {
  const merchantEnabledProducts = useApp((s) => s.merchantEnabledProducts);

  const pgProducts = merchantEnabledProducts?.pgProducts ?? [];
  const isPAEnabled  = PA_PRODUCT_FLAGS.some((f) => pgProducts.includes(f));
  const isMCAEnabled = pgProducts.includes("GLOBAL_FUND_TRANSFER");

  // null = no explicit user selection yet; derive from product flags once they load
  const [segment, setSegment] = useState<string | null>(null);
  const activeSegment = segment ?? (isPAEnabled ? SEGMENT_PA : isMCAEnabled ? SEGMENT_MCA : SEGMENT_PA);
  const showSegmentToggle = isPAEnabled && isMCAEnabled;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Transactions"
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" className="w-3.5 h-3.5" />}
          >
            Export Report
          </Button>
        }
      />

      {/* Segment toggle — only shown when merchant has both PA and MCA */}
      {showSegmentToggle && (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit border border-border">
          {SEGMENTS.map((seg) => (
            <Button
              key={seg.value}
              variant="ghost"
              size="sm"
              onClick={() => setSegment(seg.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all",
                activeSegment === seg.value
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {seg.label}
            </Button>
          ))}
        </div>
      )}

      {activeSegment === SEGMENT_PA && (isPAEnabled || !isMCAEnabled) && (
        <MidGuard productType="PA">
          <PaTransactionTable />
        </MidGuard>
      )}

      {activeSegment === SEGMENT_MCA && isMCAEnabled && (
        <MidGuard productType="PACB">
          <McaTransactionTable />
        </MidGuard>
      )}

      {/* Edge case: no products enabled */}
      {!isPAEnabled && !isMCAEnabled && (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No transaction products are enabled for this account.</p>
        </div>
      )}
    </div>
  );
}
