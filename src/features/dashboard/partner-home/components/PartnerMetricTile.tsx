"use client";

import { Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  PRODUCT_COLOURS,
  PRODUCT_NAMES,
} from "@/features/dashboard/partner-home/components/ProductSplit";

/**
 * A compact KPI for the snapshot row under the commission card: the figure,
 * its trend, then the split by product as one thin bar and one line. Short
 * enough that all three sit in view with the commission card above them.
 */
export function PartnerMetricTile({
  title,
  valueLabel,
  trendPct,
  comparisonLabel,
  split,
  formatSplit,
  shares = true,
  isLoading,
}: {
  title: string;
  valueLabel: string;
  trendPct: number;
  comparisonLabel: string;
  split: { pa: number; mca: number };
  formatSplit: (n: number) => string;
  /** False for counts that can overlap (a merchant on both products). */
  shares?: boolean;
  isLoading?: boolean;
}) {
  const up = trendPct >= 0;
  const total = split.pa + split.mca;
  const paPct = total > 0 ? Math.round((split.pa / total) * 100) : 0;
  const rows = [
    { key: "pa" as const, value: split.pa, pct: paPct },
    { key: "mca" as const, value: split.mca, pct: total > 0 ? 100 - paPct : 0 },
  ];

  return (
    <Card className="gap-0 p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
      {isLoading ? (
        <div className="mt-2 space-y-2">
          <Shimmer className="h-6 w-24" />
          <Shimmer className="h-3 w-20" />
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-xl font-bold tracking-tight tabular-nums text-foreground">
            {valueLabel}
          </span>
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            <Icon name={up ? "trending-up" : "trending-down"} size={12} aria-hidden />
            {up ? "+" : ""}
            {trendPct}% {comparisonLabel}
          </span>
        </div>
      )}

      <div
        className="mt-3 flex h-1 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${PRODUCT_NAMES.pa} ${paPct}%, ${PRODUCT_NAMES.mca} ${100 - paPct}%`}
      >
        {rows.map((r) =>
          r.pct > 0 ? (
            <span
              key={r.key}
              className="h-full rounded-full"
              style={{ width: `${r.pct}%`, backgroundColor: PRODUCT_COLOURS[r.key] }}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11.5px]">
        {rows.map((r) => (
          <span key={r.key} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: PRODUCT_COLOURS[r.key] }}
            />
            {r.key === "pa" ? "PA" : "MCA"}
            <span className="font-medium tabular-nums text-foreground">{formatSplit(r.value)}</span>
            {shares && <span>· {r.pct}%</span>}
          </span>
        ))}
      </div>
    </Card>
  );
}
