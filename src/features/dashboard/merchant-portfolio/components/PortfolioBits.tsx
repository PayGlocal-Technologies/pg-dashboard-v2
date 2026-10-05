"use client";

import { Badge, StatusBadge } from "@/components/ui";
import { inr } from "@/features/dashboard/partner-home/format";
import { PRODUCT_SHORT, SETTLEMENT_META } from "@/features/dashboard/merchant-portfolio/derive";
import type {
  PortfolioMerchant,
  SettlementState,
} from "@/features/dashboard/merchant-portfolio/types";

/** Small shared pieces of the portfolio screens, built from the MCA
 *  dashboard's StatusBadge and Badge. */

export function PortfolioStatusBadge({ merchant }: { merchant: PortfolioMerchant }) {
  return merchant.status === "LIVE" ? (
    <StatusBadge variant="success" label="Live" trailIcon="check" size="sm" />
  ) : (
    <StatusBadge variant="muted" label="Deactivated" size="sm" />
  );
}

export function ProductTags({ merchant }: { merchant: PortfolioMerchant }) {
  return (
    <span className="flex flex-wrap gap-1">
      {merchant.products.map((p) => (
        <Badge key={p} variant="secondary" size="sm" className="whitespace-nowrap">
          {PRODUCT_SHORT[p]}
        </Badge>
      ))}
    </span>
  );
}

export function SettlementBadge({ state }: { state?: SettlementState }) {
  if (!state) return <span className="text-[12px] text-muted-foreground">—</span>;
  const meta = SETTLEMENT_META[state];
  return (
    <StatusBadge variant={meta.variant} label={meta.label} trailIcon={meta.trailIcon} size="sm" />
  );
}

/** A figure, with "All time" under it when it is a deactivated merchant's
 *  history rather than the selected period's. */
export function FigureCell({ value, allTime }: { value: string; allTime?: boolean }) {
  return (
    <span className="flex flex-col">
      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {allTime && <span className="text-[11px] text-muted-foreground">All time</span>}
    </span>
  );
}

export { inr };
